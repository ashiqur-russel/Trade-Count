import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pill, Select, type SelectOption } from '../../../shared/ui';
import { DISPLAY_PIPES } from '../format/display-pipes';
import { profitTone } from '../format/display-format';
import type { SignalStatus } from './signal-record';
import { SignalChart } from './signal-chart';
import { SIGNAL_STATUSES, SIGNAL_STATUS_LABEL, SIGNAL_STATUS_TONE } from './signal-status';
import { SignalTrackRecord } from './signal-track-record';

type StatusFilter = SignalStatus | 'all';

@Component({
  selector: 'tc-signals-page',
  imports: [RouterLink, Pill, Select, SignalChart, ...DISPLAY_PIPES],
  templateUrl: './signals-page.html',
  styleUrl: './signals-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalsPage {
  protected readonly trackRecord = inject(SignalTrackRecord);

  protected readonly statusLabel = SIGNAL_STATUS_LABEL;
  protected readonly statusTone = SIGNAL_STATUS_TONE;
  protected readonly statuses = SIGNAL_STATUSES;
  protected readonly filterOptions: readonly SelectOption<StatusFilter>[] = [
    { value: 'all', label: 'All signals' },
    ...SIGNAL_STATUSES.map((status) => ({ value: status, label: SIGNAL_STATUS_LABEL[status] })),
  ];
  protected readonly filter = signal<StatusFilter>('all');

  protected readonly record = computed(() => {
    const state = this.trackRecord.state();
    return state.status === 'open' ? state.record : null;
  });
  protected readonly stocks = computed(() => {
    const record = this.record();
    if (!record) return [];
    return record.stocks.map((stock) => {
      const signals = record.signals.filter((s) => s.ticker === stock.ticker);
      return {
        stock,
        signals,
        close: stock.series[stock.series.length - 1]![1],
        counts: SIGNAL_STATUSES.map((status) => ({
          status,
          count: signals.filter((s) => s.status === status).length,
          label: SIGNAL_STATUS_LABEL[status].toLowerCase(),
        })).filter((c) => c.count > 0),
      };
    });
  });
  protected readonly rows = computed(() => {
    const record = this.record();
    if (!record) return [];
    const filter = this.filter();
    const names = new Map(record.stocks.map((s) => [s.ticker, s.name]));
    return record.signals
      .filter((s) => filter === 'all' || s.status === filter)
      .map((s) => ({ ...s, stockName: names.get(s.ticker)! }));
  });

  protected readonly tone = profitTone;

  constructor() {
    void this.trackRecord.load();
  }
}
