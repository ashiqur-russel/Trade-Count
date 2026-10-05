import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type { Trade } from '@trade-count/ledger';
import { Alert, Button, EmptyState, Panel } from '../../../shared/ui';
import { DataPanel } from '../components/data-panel/data-panel';
import { LedgerPanel } from '../components/ledger-panel/ledger-panel';
import { PortfolioSummary } from '../components/portfolio-summary/portfolio-summary';
import { StocksPanel } from '../components/stocks-panel/stocks-panel';
import { TradeForm } from '../components/trade-form/trade-form';
import { NO_FILTER, type LedgerFilter } from '../data/ledger-filter';
import { PortfolioDb } from '../data/portfolio-db';
import { PortfolioStore } from '../data/portfolio-store';
import { PortfolioSync } from '../data/portfolio-sync';

@Component({
  selector: 'tc-portfolio-page',
  imports: [
    Alert,
    Button,
    EmptyState,
    Panel,
    PortfolioSummary,
    TradeForm,
    StocksPanel,
    LedgerPanel,
    DataPanel,
  ],
  providers: [PortfolioDb, PortfolioStore, PortfolioSync],
  templateUrl: './portfolio-page.html',
  styleUrl: './portfolio-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPage {
  protected readonly store = inject(PortfolioStore);
  protected readonly db = inject(PortfolioDb);
  private readonly sync = inject(PortfolioSync);
  protected readonly filter = signal<LedgerFilter>(NO_FILTER);
  protected readonly editingTrade = signal<Trade | null>(null);

  private readonly tradeForm = viewChild(TradeForm, { read: ElementRef });

  constructor() {
    void this.store.load().then(() => this.sync.start());
  }

  protected selectStock(stockId: string | null): void {
    this.filter.update((current) => ({ ...current, stockId }));
  }

  protected startEdit(trade: Trade): void {
    this.editingTrade.set(trade);
    this.tradeForm()?.nativeElement.scrollIntoView({ block: 'start' });
  }
}
