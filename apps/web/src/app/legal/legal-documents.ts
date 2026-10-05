import { imprint } from './imprint';
import type { LegalDocument, LegalKind, LegalLanguage } from './legal-document';
import type { Operator } from './operator';
import { privacy } from './privacy';
import { terms } from './terms';

const BUILDERS: Record<LegalKind, (operator: Operator, language: LegalLanguage) => LegalDocument> =
  {
    imprint,
    privacy,
    terms,
  };

export function buildLegalDocument(
  kind: LegalKind,
  language: LegalLanguage,
  operator: Operator,
): LegalDocument {
  return BUILDERS[kind](operator, language);
}
