import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Big } from '@trade-count/ledger';
import { formatPercent, formatSignedEuro, profitTone } from '../../format/display-format';

/** A signed € amount or % change, coloured as gain or loss. */
@Component({
  selector: 'tc-profit-amount',
  template: '{{ text() }}',
  styles: `
    :host {
      font-family: var(--tc-font-numeric);
      font-variant-numeric: tabular-nums;
    }

    :host([data-tone='gain']) {
      color: var(--tc-color-gain);
    }

    :host([data-tone='loss']) {
      color: var(--tc-color-loss);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-tone]': 'tone()' },
})
export class ProfitAmount {
  readonly value = input.required<Big | string>();
  readonly unit = input<'euro' | 'percent'>('euro');

  protected readonly text = computed(() =>
    this.unit() === 'percent' ? formatPercent(this.value()) : formatSignedEuro(this.value()),
  );
  protected readonly tone = computed(() => profitTone(this.value()));
}
