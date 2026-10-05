import type { LegalKind, LegalLanguage } from './legal-document';

/** One owner for the legal page URLs, shared by the routes, the footer and the language switch. */
export const LEGAL_PATHS: Record<LegalKind, Record<LegalLanguage, string>> = {
  imprint: { en: 'imprint', de: 'impressum' },
  privacy: { en: 'privacy', de: 'datenschutz' },
};

export function legalLink(kind: LegalKind, language: LegalLanguage): string {
  return `/${LEGAL_PATHS[kind][language]}`;
}

export const LEGAL_NAMES: Record<LegalKind, Record<LegalLanguage, string>> = {
  imprint: { en: 'Imprint', de: 'Impressum' },
  privacy: { en: 'Privacy', de: 'Datenschutz' },
};
