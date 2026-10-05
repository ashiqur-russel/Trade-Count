import { buildLegalDocument } from './legal-documents';
import type { LegalBlock, LegalDocument, LegalKind, LegalLanguage } from './legal-document';
import { LEGAL_NAMES, LEGAL_PATHS, legalLink } from './legal-paths';
import type { Operator } from './operator';

const operator: Operator = {
  name: 'Erika Mustermann',
  street: 'Musterstraße 1',
  postalCode: '10115',
  city: 'Berlin',
  country: 'Germany',
  email: 'hello@example.org',
};
const KINDS: LegalKind[] = ['imprint', 'privacy'];
const LANGUAGES: LegalLanguage[] = ['en', 'de'];

const texts = (doc: LegalDocument): string[] =>
  doc.sections.flatMap((s) => [
    s.heading,
    ...s.blocks.flatMap((b: LegalBlock) =>
      b.type === 'p'
        ? [b.text]
        : b.type === 'list'
          ? b.items
          : b.type === 'address'
            ? b.lines
            : [b.address],
    ),
  ]);

describe('legal documents', () => {
  it.each(KINDS)(
    '%s has the same structure in English and German, so neither language is missing a section',
    (kind) => {
      const [en, de] = LANGUAGES.map((language) => buildLegalDocument(kind, language, operator));

      expect(de.sections.map((s) => s.blocks.map((b) => b.type))).toEqual(
        en.sections.map((s) => s.blocks.map((b) => b.type)),
      );
      expect(de.sections.map((s) => s.blocks.length)).toEqual(
        en.sections.map((s) => s.blocks.length),
      );
    },
  );

  it.each(KINDS.flatMap((kind) => LANGUAGES.map((language) => [kind, language] as const)))(
    '%s (%s) names the operator and the contact email and has no empty text',
    (kind, language) => {
      const all = texts(buildLegalDocument(kind, language, operator));

      expect(all).toContain('Erika Mustermann');
      expect(all).toContain('hello@example.org');
      expect(all.every((text) => text.trim().length > 0)).toBe(true);
    },
  );

  it('the imprint names the provider with a full postal address', () => {
    const doc = buildLegalDocument('imprint', 'de', operator);
    const address = doc.sections[0]!.blocks[0]!;

    expect(doc.title).toBe('Impressum');
    expect(address).toEqual({
      type: 'address',
      lines: ['Erika Mustermann', 'Musterstraße 1', '10115 Berlin', 'Deutschland'],
    });
  });

  it.each(LANGUAGES)(
    'the privacy policy (%s) covers hosting, device storage, sync, abuse limits and rights',
    (language) => {
      const text = texts(buildLegalDocument('privacy', language, operator)).join(' ');

      for (const fact of ['Cloudflare', 'D1', 'DSGVO|GDPR', 'TDDDG', 'Art. 11', 'Turn off sync']) {
        expect(text).toMatch(new RegExp(fact));
      }
    },
  );

  it('shows the country in the language of the page', () => {
    const lastLine = (language: LegalLanguage) => {
      const block = buildLegalDocument('imprint', language, operator).sections[0]!.blocks[0]!;
      return block.type === 'address' ? block.lines.at(-1) : undefined;
    };

    expect(lastLine('en')).toBe('Germany');
    expect(lastLine('de')).toBe('Deutschland');
  });

  it('writes the update date the way each language reads it', () => {
    expect(buildLegalDocument('privacy', 'de', operator).updated).toBe('Stand: 05.10.2026');
    expect(buildLegalDocument('imprint', 'en', operator).updated).toBe(
      'Last updated: 5 October 2026',
    );
  });

  it('every legal page has its own path and name in both languages', () => {
    const paths = KINDS.flatMap((kind) => LANGUAGES.map((language) => LEGAL_PATHS[kind][language]));

    expect(new Set(paths).size).toBe(4);
    expect(legalLink('privacy', 'de')).toBe('/datenschutz');
    expect(LEGAL_NAMES.imprint).toEqual({ en: 'Imprint', de: 'Impressum' });
  });
});
