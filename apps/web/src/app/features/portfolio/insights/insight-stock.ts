import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Big } from '@trade-count/ledger';
import { PRICE_LIMITS } from '@trade-count/local-store';
import { Pill, type PillTone } from '../../../shared/ui';
import { parseDecimalInput } from '../format/decimal-input';
import { DISPLAY_PIPES } from '../format/display-pipes';
import { InsightChart } from './insight-chart';
import { InsightPrices } from './insight-prices';
import type { InsightCurrency, TextOptions } from './insight-text';
import { InsightTextView } from './insight-text-view';
import type { MatchedInsight } from './insights-match';
import { levelRows, positionFigures } from './position-figures';

/** Everything the edition says about one of the user's stocks, with their own position applied. */
@Component({
  selector: 'tc-insight-stock',
  imports: [Pill, InsightChart, InsightTextView, ...DISPLAY_PIPES],
  templateUrl: './insight-stock.html',
  styleUrl: './insight-stock.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightStock {
  private readonly prices = inject(InsightPrices);

  readonly matched = input.required<MatchedInsight>();
  readonly asOf = input.required<string>();
  readonly usdPerEur = input.required<number>();
  readonly currency = input.required<InsightCurrency>();

  protected readonly stock = computed(() => this.matched().insight);
  protected readonly closeEur = computed(() =>
    new Big(this.stock().closeUsd).div(this.usdPerEur()),
  );
  protected readonly typedPrice = computed(() =>
    this.prices.priceFor(this.asOf(), this.stock().ticker),
  );
  protected readonly priceNowEur = computed(() => {
    const typed = this.typedPrice();
    return typed ? new Big(typed) : this.closeEur();
  });
  protected readonly figures = computed(() =>
    positionFigures(this.matched().entry, this.priceNowEur()),
  );
  protected readonly levels = computed(() => {
    const figures = this.figures();
    const position = this.stock().position;
    return figures && position ? levelRows(position, figures, this.usdPerEur()) : [];
  });
  protected readonly textOptions = computed<TextOptions>(() => ({
    currency: this.currency(),
    usdPerEur: this.usdPerEur(),
    position: this.figures(),
  }));
  protected readonly directionTone = computed<PillTone>(() =>
    this.stock().verdict.tone === 'neutral' ? 'neutral' : this.stock().verdict.tone,
  );

  protected setPrice(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.trim();
    const parsed = raw ? parseDecimalInput(raw, PRICE_LIMITS) : null;
    if (raw && !parsed) return;
    this.prices.set(this.asOf(), this.stock().ticker, parsed);
    input.value = this.priceNowEur().toFixed(2).replace('.', ',');
  }

  protected tone(value: Big | number): 'gain' | 'loss' | null {
    const amount = new Big(value);
    return amount.gt(0) ? 'gain' : amount.lt(0) ? 'loss' : null;
  }

  protected impactTone(impact: string): PillTone {
    return impact === 'HIGH'
      ? 'loss'
      : impact === 'MED'
        ? 'warn'
        : impact === 'LOW'
          ? 'gain'
          : 'neutral';
  }
}
