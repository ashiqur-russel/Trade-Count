import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { LegalKind, LegalLanguage } from './legal-document';
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
  protected readonly backLabel =
    this.route.language === 'de' ? '← Zurück zu Trade Count' : '← Back to Trade Count';
}
