import type { LegalLanguage } from './legal-document';
import type { Operator } from './operator';

/** The postal address as shown in the Imprint and the Privacy policy, with the country in the page's language. */
export function addressLines(operator: Operator, language: LegalLanguage): string[] {
  const country =
    language === 'de' && operator.country === 'Germany' ? 'Deutschland' : operator.country;
  return [operator.name, operator.street, `${operator.postalCode} ${operator.city}`, country];
}
