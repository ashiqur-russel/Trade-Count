import { updatedLine, type LegalDocument, type LegalLanguage } from './legal-document';
import type { Operator } from './operator';

const address = (o: Operator) => [o.name, o.street, `${o.postalCode} ${o.city}`, o.country];

export function imprint(operator: Operator, language: LegalLanguage): LegalDocument {
  return language === 'de' ? german(operator) : english(operator);
}

function english(o: Operator): LegalDocument {
  return {
    title: 'Imprint',
    updated: updatedLine('en'),
    sections: [
      { heading: 'Provider (§ 5 DDG)', blocks: [{ type: 'address', lines: address(o) }] },
      {
        heading: 'Contact',
        blocks: [
          { type: 'email', address: o.email },
          { type: 'p', text: 'We answer emails as quickly as we can.' },
        ],
      },
      {
        heading: 'Not tax or investment advice',
        blocks: [
          {
            type: 'p',
            text:
              'Trade Count calculates profit and loss from the trades you enter, using the first-in-first-out (FIFO) method. ' +
              'It is a calculator, not tax, legal or investment advice. Results can differ from your broker’s statements or ' +
              'your tax situation, for example because of fees, taxes, corporate actions or different lot-assignment rules. ' +
              'Please check important figures against your broker’s documents.',
          },
        ],
      },
      {
        heading: 'Consumer dispute resolution',
        blocks: [
          {
            type: 'p',
            text: 'We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration board.',
          },
        ],
      },
    ],
  };
}

function german(o: Operator): LegalDocument {
  return {
    title: 'Impressum',
    updated: updatedLine('de'),
    sections: [
      { heading: 'Angaben gemäß § 5 DDG', blocks: [{ type: 'address', lines: address(o) }] },
      {
        heading: 'Kontakt',
        blocks: [
          { type: 'email', address: o.email },
          { type: 'p', text: 'E-Mails beantworten wir so schnell wie möglich.' },
        ],
      },
      {
        heading: 'Keine Steuer- oder Anlageberatung',
        blocks: [
          {
            type: 'p',
            text:
              'Trade Count berechnet Gewinn und Verlust aus den von Ihnen eingegebenen Käufen und Verkäufen nach dem ' +
              'First-in-first-out-Verfahren (FIFO). Es ist ein Rechenwerkzeug und keine Steuer-, Rechts- oder Anlageberatung. ' +
              'Die Ergebnisse können von den Abrechnungen Ihres Brokers oder von Ihrer steuerlichen Situation abweichen, zum ' +
              'Beispiel wegen Gebühren, Steuern, Kapitalmaßnahmen oder anderer Zuordnungsregeln. Bitte prüfen Sie wichtige ' +
              'Zahlen anhand der Unterlagen Ihres Brokers.',
          },
        ],
      },
      {
        heading: 'Verbraucherstreitbeilegung',
        blocks: [
          {
            type: 'p',
            text:
              'Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle ' +
              'teilzunehmen.',
          },
        ],
      },
    ],
  };
}
