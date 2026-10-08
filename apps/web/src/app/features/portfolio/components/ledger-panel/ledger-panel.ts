import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
} from '@angular/core';
import type { Trade } from '@trade-count/ledger';
import { EmptyState, Paginator, Tabs, pageSlice, type TabItem } from '../../../../shared/ui';
import { isFiltered, type LedgerFilter, type LedgerTab } from '../../data/ledger-filter';
import {
  historyRows,
  openLotRows,
  saleRows,
  sheetGroups,
  sheetLines,
  sheetTotals,
} from '../../data/ledger-views';
import { PortfolioStore } from '../../data/portfolio-store';
import { LedgerFilters } from '../ledger-filters/ledger-filters';
import { OpenLotsTable } from '../open-lots-table/open-lots-table';
import { SalesTable } from '../sales-table/sales-table';
import { SheetTable } from '../sheet-table/sheet-table';
import { TradeHistoryTable } from '../trade-history-table/trade-history-table';

@Component({
  selector: 'tc-ledger-panel',
  imports: [
    Tabs,
    EmptyState,
    Paginator,
    LedgerFilters,
    SheetTable,
    OpenLotsTable,
    SalesTable,
    TradeHistoryTable,
  ],
  templateUrl: './ledger-panel.html',
  styleUrl: './ledger-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LedgerPanel {
  private readonly store = inject(PortfolioStore);

  readonly filter = model.required<LedgerFilter>();
  readonly editingTradeId = input<string | null>(null);
  readonly editTrade = output<Trade>();

  protected readonly tab = signal<LedgerTab>('sheet');
  /** Phones start with fewer rows so the page stays short; the selector offers more. */
  protected readonly pageSize = signal(
    inject(DOCUMENT).defaultView?.matchMedia('(max-width: 640px)').matches ? 10 : 25,
  );
  /** Back to page 1 whenever the tab, filter or page size changes. */
  protected readonly page = linkedSignal({
    source: () => [this.tab(), this.filter(), this.pageSize()],
    computation: () => 1,
  });

  private readonly groups = computed(() =>
    sheetGroups(this.store.stocks(), this.store.shareRows(), this.filter()),
  );
  protected readonly sheet = computed(() => sheetLines(this.groups()));
  protected readonly sheetGrandTotal = computed(() =>
    this.groups().length > 1 ? sheetTotals(this.groups()) : null,
  );
  protected readonly lots = computed(() =>
    openLotRows(this.store.stocks(), this.store.ledger(), this.filter()),
  );
  protected readonly sales = computed(() =>
    saleRows(this.store.stocks(), this.store.ledger(), this.filter()),
  );
  protected readonly history = computed(() =>
    historyRows(this.store.stocks(), this.store.trades(), this.filter()),
  );

  protected readonly isFiltered = computed(() => isFiltered(this.filter()));
  protected readonly tabs = computed<TabItem<LedgerTab>[]>(() => [
    {
      id: 'sheet',
      label: 'Sheet view',
      count: this.groups().reduce((n, g) => n + g.rows.length, 0),
    },
    { id: 'lots', label: 'Open lots', count: this.lots().length },
    { id: 'sales', label: 'Sales (FIFO)', count: this.sales().length },
    { id: 'history', label: 'All trades', count: this.history().length },
  ]);

  protected readonly rowCount = computed(
    () =>
      ({ sheet: this.sheet(), lots: this.lots(), sales: this.sales(), history: this.history() })[
        this.tab()
      ].length,
  );

  protected readonly sheetPage = computed(() =>
    pageSlice(this.sheet(), this.page(), this.pageSize()),
  );
  protected readonly lotsPage = computed(() =>
    pageSlice(this.lots(), this.page(), this.pageSize()),
  );
  protected readonly salesPage = computed(() =>
    pageSlice(this.sales(), this.page(), this.pageSize()),
  );
  protected readonly historyPage = computed(() =>
    pageSlice(this.history(), this.page(), this.pageSize()),
  );
}
