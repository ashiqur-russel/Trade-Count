import { Routes } from '@angular/router';

import type { LegalKind, LegalLanguage } from './legal/legal-document';
import { LEGAL_NAMES, LEGAL_PATHS } from './legal/legal-paths';

const legalRoutes: Routes = (Object.keys(LEGAL_PATHS) as LegalKind[]).flatMap((kind) =>
  (Object.keys(LEGAL_PATHS[kind]) as LegalLanguage[]).map((language) => ({
    path: LEGAL_PATHS[kind][language],
    title: `${LEGAL_NAMES[kind][language]} · Trade Count`,
    data: { kind, language },
    loadComponent: () => import('./legal/legal-page').then((m) => m.LegalPage),
  })),
);

export const routes: Routes = [
  ...legalRoutes,
  {
    path: '',
    loadChildren: () =>
      import('./features/portfolio/portfolio.routes').then((m) => m.PORTFOLIO_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
