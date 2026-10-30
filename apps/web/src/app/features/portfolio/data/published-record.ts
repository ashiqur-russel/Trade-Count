import { signal } from '@angular/core';
import { fetchPublishedJson } from './published-json';

export type PublishedRecordState<T> =
  | { status: 'loading' }
  | { status: 'open'; record: T }
  | { status: 'failed'; message: string };

export interface PublishedRecordMessages {
  /** This version of the app ships no such file. */
  none: string;
  /** The file is there but its format isn't understood. */
  unreadable: string;
}

const OFFLINE = "It couldn't be loaded. Check the connection and try again.";

/** A JSON record shipped with the app, loaded once and parsed into `T`. */
export class PublishedRecord<T> {
  readonly state = signal<PublishedRecordState<T>>({ status: 'loading' });

  constructor(
    private readonly url: string,
    private readonly parse: (json: string) => T,
    private readonly messages: PublishedRecordMessages,
  ) {}

  async load(): Promise<void> {
    if (this.state().status === 'open') return;
    this.state.set({ status: 'loading' });
    let json: string | null;
    try {
      json = await fetchPublishedJson(this.url);
    } catch {
      this.state.set({ status: 'failed', message: OFFLINE });
      return;
    }
    if (json === null) {
      this.state.set({ status: 'failed', message: this.messages.none });
      return;
    }
    try {
      this.state.set({ status: 'open', record: this.parse(json) });
    } catch {
      this.state.set({ status: 'failed', message: this.messages.unreadable });
    }
  }
}
