import { imprint } from './imprint';
import type { LegalDocument, LegalKind, LegalLanguage } from './legal-document';
import type { Operator } from './operator';
import { privacy } from './privacy';

export function buildLegalDocument(
  kind: LegalKind,
  language: LegalLanguage,
  operator: Operator,
): LegalDocument {
  return (kind === 'imprint' ? imprint : privacy)(operator, language);
}
