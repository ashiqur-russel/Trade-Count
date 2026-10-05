import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Trade Count',
    loadComponent: () =>
      import('./features/portfolio/portfolio-page/portfolio-page').then((m) => m.PortfolioPage),
  },
  { path: '**', redirectTo: '' },
];
