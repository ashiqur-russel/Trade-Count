import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import {
  Button,
  DatePicker,
  SegmentedControl,
  Select,
  type SegmentOption,
  type SelectOption,
} from '../../../../shared/ui';
import { NO_FILTER, isFiltered, type LedgerFilter, type LedgerTab } from '../../data/ledger-filter';
import { PortfolioStore } from '../../data/portfolio-store';

@Component({
  selector: 'tc-ledger-filters',
  imports: [Button, DatePicker, SegmentedControl, Select],
  templateUrl: './ledger-filters.html',
  styleUrl: './ledger-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LedgerFilters {
  protected readonly stocks = inject(PortfolioStore).stocks;

  readonly tab = input.required<LedgerTab>();
  readonly filter = model.required<LedgerFilter>();

  protected readonly statusOptions: readonly SegmentOption<LedgerFilter['status']>[] = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
  ];
  protected readonly sideOptions: readonly SegmentOption<LedgerFilter['side']>[] = [
    { value: 'all', label: 'All' },
    { value: 'buy', label: 'Buys' },
    { value: 'sell', label: 'Sales' },
  ];
  protected readonly filtered = computed(() => isFiltered(this.filter()));
  protected readonly stockOptions = computed<SelectOption<string>[]>(() => [
    { value: '', label: 'All stocks' },
    ...this.stocks().map((s) => ({ value: s.id, label: s.name })),
  ]);

  protected set<K extends keyof LedgerFilter>(key: K, value: LedgerFilter[K]): void {
    this.filter.update((current) => ({ ...current, [key]: value }));
  }

  protected reset(): void {
    this.filter.set(NO_FILTER);
  }
}
