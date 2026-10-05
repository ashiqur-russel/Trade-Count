import { formatIsoDate } from '../shared/dates/iso-date';

export type LegalLanguage = 'en' | 'de';
export type LegalKind = 'imprint' | 'privacy';

export type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'address'; lines: string[] }
  | { type: 'email'; address: string };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  /** Shown under the title, e.g. "Last updated: 05.10.2026". */
  updated: string;
  sections: LegalSection[];
}

/** The date both documents were last reviewed against how the app works. */
export const LEGAL_LAST_UPDATED = '2026-10-05';

/** "Stand: 05.10.2026" / "Last updated: 5 October 2026" */
export function updatedLine(language: LegalLanguage): string {
  if (language === 'de') return `Stand: ${formatIsoDate(LEGAL_LAST_UPDATED)}`;
  const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(LEGAL_LAST_UPDATED),
  );
  return `Last updated: ${date}`;
}
