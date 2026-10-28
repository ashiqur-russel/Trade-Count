import { Injectable, signal } from '@angular/core';
import { fetchPublishedJson } from '../data/published-json';
import { InsightsBundleError, parseInsightsBundle, type InsightsBundle } from './insights-bundle';

const EDITION_URL = '/insights.json';

export type InsightsEditionState =
  | { status: 'loading' }
  | { status: 'open'; bundle: InsightsBundle }
  | { status: 'failed'; message: string };

/** The market notes edition shipped with the app. */
@Injectable({ providedIn: 'root' })
export class InsightsEdition {
  readonly state = signal<InsightsEditionState>({ status: 'loading' });

  async load(): Promise<void> {
    if (this.state().status === 'open') return;
    this.state.set({ status: 'loading' });
    try {
      this.state.set({ status: 'open', bundle: await fetchEdition() });
    } catch (error) {
      this.state.set({ status: 'failed', message: messageFor(error) });
    }
  }
}

class NoEditionError extends Error {}

async function fetchEdition(): Promise<InsightsBundle> {
  const json = await fetchPublishedJson(EDITION_URL);
  if (json === null) throw new NoEditionError();
  return parseInsightsBundle(json);
}

function messageFor(error: unknown): string {
  if (error instanceof NoEditionError) return 'No notes are published in this version of the app.';
  if (error instanceof InsightsBundleError) return error.message;
  return "The notes couldn't be loaded. Check the connection and try again.";
}
