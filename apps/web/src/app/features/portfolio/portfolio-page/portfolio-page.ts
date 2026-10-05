import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Portfolio } from '@trade-count/ledger';
import { apiErrorMessage } from '../../../core/api/api-error-message';
import { PortfolioApi } from '../../../core/api/portfolio-api';
import { EmptyState, Panel, Pill, type PillTone } from '../../../shared/ui';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; portfolio: Portfolio }
  | { status: 'error'; message: string };

const STATUS_BADGES: Record<LoadState['status'], { tone: PillTone; label: string }> = {
  loading: { tone: 'neutral', label: 'Loading…' },
  ready: { tone: 'gain', label: 'Connected' },
  error: { tone: 'loss', label: 'Offline' },
};

@Component({
  selector: 'tc-portfolio-page',
  imports: [Panel, Pill, EmptyState],
  templateUrl: './portfolio-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPage {
  protected readonly state = signal<LoadState>({ status: 'loading' });
  protected readonly statusBadges = STATUS_BADGES;

  constructor() {
    inject(PortfolioApi)
      .getPortfolio()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (portfolio) => this.state.set({ status: 'ready', portfolio }),
        error: (error: unknown) =>
          this.state.set({ status: 'error', message: apiErrorMessage(error) }),
      });
  }
}
