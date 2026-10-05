import { ChangeDetectionStrategy, Component, DOCUMENT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { LegalLanguage } from '../legal/legal-document';
import { LEGAL_NAMES, legalLink } from '../legal/legal-paths';

/** The public repository; AGPL-3.0 users of the running app should be able to find the source. */
const SOURCE_URL = 'https://github.com/ashiqur-russel/Trade-Count';

@Component({
  selector: 'tc-site-footer',
  imports: [RouterLink],
  template: `
    <footer>
      <nav aria-label="Legal">
        <a [routerLink]="imprint">{{ imprintName }}</a>
        <a [routerLink]="privacy">{{ privacyName }}</a>
        <a [routerLink]="terms">{{ termsName }}</a>
        <a [href]="sourceUrl" target="_blank" rel="noopener">{{ sourceName }}</a>
      </nav>
      <p>Trade Count is a calculator, not tax or investment advice.</p>
    </footer>
  `,
  styles: `
    footer {
      display: flex;
      flex-wrap: wrap;
      gap: var(--tc-space-3) var(--tc-space-6);
      align-items: center;
      justify-content: space-between;
      width: var(--tc-page-width);
      margin: 0 auto;
      padding-block: var(--tc-space-5);
      border-top: var(--tc-rule-width) solid var(--tc-color-rule);
      color: var(--tc-color-text-muted);
      font-size: var(--tc-text-sm);
    }

    nav {
      display: flex;
      gap: var(--tc-space-5);
    }

    a {
      color: var(--tc-color-text);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  private readonly language: LegalLanguage = inject(
    DOCUMENT,
  ).defaultView?.navigator.language.startsWith('de')
    ? 'de'
    : 'en';

  protected readonly imprintName = LEGAL_NAMES.imprint[this.language];
  protected readonly privacyName = LEGAL_NAMES.privacy[this.language];
  protected readonly termsName = LEGAL_NAMES.terms[this.language];
  protected readonly imprint = legalLink('imprint', this.language);
  protected readonly privacy = legalLink('privacy', this.language);
  protected readonly terms = legalLink('terms', this.language);
  protected readonly sourceUrl = SOURCE_URL;
  protected readonly sourceName =
    this.language === 'de' ? 'Quellcode (AGPL-3.0)' : 'Source code (AGPL-3.0)';
}
