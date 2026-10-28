import { Injectable, signal } from '@angular/core';
import { fetchPublishedJson } from '../data/published-json';
import { parseSignalRecord, SignalRecordError, type SignalRecord } from './signal-record';

const RECORD_URL = '/signals.json';

export type SignalTrackRecordState =
  | { status: 'loading' }
  | { status: 'open'; record: SignalRecord }
  | { status: 'failed'; message: string };

/** The signal track record shipped with the app. */
@Injectable({ providedIn: 'root' })
export class SignalTrackRecord {
  readonly state = signal<SignalTrackRecordState>({ status: 'loading' });

  async load(): Promise<void> {
    if (this.state().status === 'open') return;
    this.state.set({ status: 'loading' });
    try {
      const json = await fetchPublishedJson(RECORD_URL);
      if (json === null) {
        this.state.set({
          status: 'failed',
          message: 'No track record is published in this version of the app.',
        });
        return;
      }
      this.state.set({ status: 'open', record: parseSignalRecord(json) });
    } catch (error) {
      this.state.set({
        status: 'failed',
        message:
          error instanceof SignalRecordError
            ? error.message
            : "The track record couldn't be loaded. Check the connection and try again.",
      });
    }
  }
}
