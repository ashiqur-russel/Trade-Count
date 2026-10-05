import { ChangeDetectionStrategy, Component, DOCUMENT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { LegalLanguage } from '../legal/legal-document';
import { LEGAL_NAMES, legalLink } from '../legal/legal-paths';

@Component({
  selector: 'tc-site-footer',
  imports: [RouterLink],
  template: `
    <footer>
      <nav aria-label="Legal">
        <a [routerLink]="imprint">{{ imprintName }}</a>
        <a [routerLink]="privacy">{{ privacyName }}</a>
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
      max-width: var(--tc-content-max-width);
      margin: 0 auto;
      padding: var(--tc-space-5);
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
  protected readonly imprint = legalLink('imprint', this.language);
  protected readonly privacy = legalLink('privacy', this.language);
}
