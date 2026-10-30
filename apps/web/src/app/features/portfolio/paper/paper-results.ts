import { Injectable } from '@angular/core';
import { PublishedRecord } from '../data/published-record';
import { parsePaperRecord, type PaperRecord } from './paper-record';

/** The agent's paper trading results shipped with the app. */
@Injectable({ providedIn: 'root' })
export class PaperResults extends PublishedRecord<PaperRecord> {
  constructor() {
    super('/paper.json', parsePaperRecord, {
      none: 'No paper trading results are published yet. The agent publishes them after each US close.',
      unreadable: "The paper results can't be read: the file isn't in a format this app understands.",
    });
  }
}
