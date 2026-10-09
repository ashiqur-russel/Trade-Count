import type { Routes } from '@angular/router';
import { PortfolioDb } from './data/portfolio-db';
import { PortfolioStore } from './data/portfolio-store';
import { PortfolioSync } from './data/portfolio-sync';

/** One database, store and sync service shared by both pages, so sync keeps running while either is open. */
export const PORTFOLIO_ROUTES: Routes = [
  {
    path: '',
    providers: [PortfolioDb, PortfolioStore, PortfolioSync],
    loadComponent: () => import('./portfolio-shell/portfolio-shell').then((m) => m.PortfolioShell),
    children: [
      {
        path: '',
        title: 'Trade Count',
        loadComponent: () => import('./portfolio-page/portfolio-page').then((m) => m.PortfolioPage),
      },
      {
        path: 'reports',
        title: 'Reports · Trade Count',
        loadComponent: () => import('./reports-page/reports-page').then((m) => m.ReportsPage),
      },
      {
        path: 'insights',
        title: 'Insights · Trade Count',
        loadComponent: () => import('./insights/insights-page').then((m) => m.InsightsPage),
      },
      {
        path: 'settings',
        title: 'Settings · Trade Count',
        loadComponent: () => import('./settings-page/settings-page').then((m) => m.SettingsPage),
      },
    ],
  },
];
