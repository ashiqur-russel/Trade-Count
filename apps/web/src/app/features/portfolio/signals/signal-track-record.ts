import { Injectable } from '@angular/core';
import { PublishedRecord } from '../data/published-record';
import { parseSignalRecord, type SignalRecord } from './signal-record';

/** The signal track record shipped with the app. */
@Injectable({ providedIn: 'root' })
export class SignalTrackRecord extends PublishedRecord<SignalRecord> {
  constructor() {
    super('/signals.json', parseSignalRecord, {
      none: 'No track record is published in this version of the app.',
      unreadable: "The track record can't be read: the file isn't in a format this app understands.",
    });
  }
}
