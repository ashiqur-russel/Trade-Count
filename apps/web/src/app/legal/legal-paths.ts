import type { LegalKind, LegalLanguage } from './legal-document';

/** One owner for the legal page URLs and names, shared by the routes, the footer and the language switch. */
export const LEGAL_PATHS: Record<LegalKind, Record<LegalLanguage, string>> = {
  imprint: { en: 'imprint', de: 'impressum' },
  privacy: { en: 'privacy', de: 'datenschutz' },
  terms: { en: 'terms', de: 'nutzungsbedingungen' },
};

export const LEGAL_NAMES: Record<LegalKind, Record<LegalLanguage, string>> = {
  imprint: { en: 'Imprint', de: 'Impressum' },
  privacy: { en: 'Privacy', de: 'Datenschutz' },
  terms: { en: 'Terms', de: 'Nutzungsbedingungen' },
};

export function legalLink(kind: LegalKind, language: LegalLanguage): string {
  return `/${LEGAL_PATHS[kind][language]}`;
}
