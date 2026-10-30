import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pill } from '../../../shared/ui';
import { DISPLAY_PIPES } from '../format/display-pipes';
import { profitTone } from '../format/display-format';
import { paperFigures } from './paper-figures';
import { triggerText } from './paper-order-text';
import { PaperResults } from './paper-results';
import { PaperValueChart } from './paper-value-chart';

@Component({
  selector: 'tc-paper-page',
  imports: [RouterLink, Pill, PaperValueChart, ...DISPLAY_PIPES],
  templateUrl: './paper-page.html',
  styleUrl: './paper-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaperPage {
  protected readonly results = inject(PaperResults);

  protected readonly record = computed(() => {
    const state = this.results.state();
    return state.status === 'open' ? state.record : null;
  });
  protected readonly figures = computed(() => {
    const record = this.record();
    return record ? paperFigures(record) : null;
  });
  protected readonly trades = computed(() => {
    const record = this.record();
    if (!record) return [];
    const names = new Map(record.stocks.map((s) => [s.symbol, s.name]));
    return [...record.trades].reverse().map((t) => ({ ...t, stockName: names.get(t.symbol)! }));
  });

  protected readonly orders = computed(() => {
    const record = this.record();
    if (!record?.orders) return [];
    const names = new Map(record.stocks.map((s) => [s.symbol, s.name]));
    return record.orders.map((o) => ({ ...o, stockName: names.get(o.symbol)!, when: triggerText(o.trigger) }));
  });

  protected readonly tone = profitTone;

  constructor() {
    void this.results.load();
  }
}
