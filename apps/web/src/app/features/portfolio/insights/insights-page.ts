import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Big } from '@trade-count/ledger';
import { Button, Pill, SegmentedControl, type SegmentOption } from '../../../shared/ui';
import { CheckRow } from '../components/sync-panel/check-row';
import { SyncKeyField } from '../components/sync-panel/sync-key-field';
import { PortfolioStore } from '../data/portfolio-store';
import { DISPLAY_PIPES } from '../format/display-pipes';
import { InsightPrices } from './insight-prices';
import { InsightStock } from './insight-stock';
import type { InsightCurrency } from './insight-text';
import { InsightTextView } from './insight-text-view';
import { InsightsVault } from './insights-vault';
import { matchInsights, type MatchedInsight } from './insights-match';
import { positionFigures } from './position-figures';

const STALE_AFTER_DAYS = 7;
const CURRENCY_STORAGE_KEY = 'tc-insights-currency';

@Component({
  selector: 'tc-insights-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Button,
    Pill,
    SegmentedControl,
    SyncKeyField,
    CheckRow,
    InsightStock,
    InsightTextView,
    ...DISPLAY_PIPES,
  ],
  templateUrl: './insights-page.html',
  styleUrl: './insights-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsPage {
  private readonly store = inject(PortfolioStore);
  private readonly prices = inject(InsightPrices);
  protected readonly vault = inject(InsightsVault);

  protected readonly keyInput = new FormControl('', { nonNullable: true });
  protected readonly rememberKey = signal(true);

  protected readonly currencyOptions: readonly SegmentOption<InsightCurrency>[] = [
    { value: 'EUR', label: '€ EUR' },
    { value: 'USD', label: '$ USD' },
  ];
  protected readonly currency = signal<InsightCurrency>(readCurrency());

  protected readonly bundle = computed(() => {
    const state = this.vault.state();
    return state.status === 'open' ? state.bundle : null;
  });
  protected readonly matches = computed(() => {
    const bundle = this.bundle();
    return bundle ? matchInsights(bundle, this.store.ledger()) : [];
  });
  protected readonly stale = computed(() => {
    const bundle = this.bundle();
    return !!bundle && Date.now() - Date.parse(bundle.asOf) > STALE_AFTER_DAYS * 86_400_000;
  });

  constructor() {
    void this.vault.openWithStoredKey();
  }

  protected unlock(): void {
    const key = this.keyInput.value.trim();
    if (key) void this.vault.unlock(key, this.rememberKey());
  }

  protected forget(): void {
    this.vault.forget();
    this.keyInput.setValue('');
  }

  protected chooseCurrency(currency: InsightCurrency): void {
    this.currency.set(currency);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch {
      // Kept for this visit only.
    }
  }

  protected closeEur(match: MatchedInsight): Big {
    return new Big(match.insight.closeUsd).div(this.bundle()!.usdPerEur);
  }

  protected cardFigures(match: MatchedInsight) {
    const bundle = this.bundle()!;
    const typed = this.prices.priceFor(bundle.asOf, match.insight.ticker);
    return positionFigures(match.entry, typed ? new Big(typed) : this.closeEur(match));
  }

  protected tone(value: Big | number): 'gain' | 'loss' | null {
    const amount = new Big(value);
    return amount.gt(0) ? 'gain' : amount.lt(0) ? 'loss' : null;
  }

  protected anchorFor(match: MatchedInsight): string {
    return `insight-${match.insight.ticker}`;
  }
}

function readCurrency(): InsightCurrency {
  try {
    return localStorage.getItem(CURRENCY_STORAGE_KEY) === 'USD' ? 'USD' : 'EUR';
  } catch {
    return 'EUR';
  }
}
