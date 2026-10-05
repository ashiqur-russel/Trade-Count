import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { sectionId, type LegalKind, type LegalLanguage } from './legal-document';
import { buildLegalDocument } from './legal-documents';
import { legalLink } from './legal-paths';
import { OPERATOR } from './operator';

interface LegalRouteData {
  kind: LegalKind;
  language: LegalLanguage;
}

@Component({
  selector: 'tc-legal-page',
  imports: [RouterLink],
  templateUrl: './legal-page.html',
  styleUrl: './legal-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPage {
  private readonly route = inject(ActivatedRoute).snapshot.data as LegalRouteData;

  protected readonly doc = buildLegalDocument(this.route.kind, this.route.language, OPERATOR);
  protected readonly language = this.route.language;
  protected readonly otherLanguage = {
    label: this.route.language === 'de' ? 'English' : 'Deutsch',
    lang: this.route.language === 'de' ? 'en' : 'de',
    link: legalLink(this.route.kind, this.route.language === 'de' ? 'en' : 'de'),
  };
  protected readonly pagePath = legalLink(this.route.kind, this.route.language);
  /** Short documents (the imprint) read fine without a table of contents. */
  protected readonly showContents = this.doc.sections.length > 4;
  protected readonly sectionId = sectionId;
  protected readonly labels =
    this.route.language === 'de'
      ? {
          back: '← Zurück zu Trade Count',
          contents: 'Inhalt',
          pageNavigation: 'Seitennavigation',
          currentLanguage: 'Deutsch',
        }
      : {
          back: '← Back to Trade Count',
          contents: 'Contents',
          pageNavigation: 'Page navigation',
          currentLanguage: 'English',
        };
}
