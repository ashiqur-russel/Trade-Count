import {
  Big,
  compareTrades,
  type Ledger,
  type OpenLot,
  type Sale,
  type ShareRow,
  type Stock,
  type Trade,
} from '@trade-count/ledger';
import { isWithinDates, type LedgerFilter } from './ledger-filter';

export interface SheetGroup {
  stock: Stock;
  rows: ShareRow[];
  sold: Big;
  open: Big;
  openCost: Big;
  profit: Big;
}

/** Sheet rows flattened for paging: each share, then its stock's subtotal. */
export type SheetLine =
  | { kind: 'share'; group: SheetGroup; row: ShareRow; number: number }
  | { kind: 'subtotal'; group: SheetGroup };

export interface SheetTotals {
  sold: Big;
  open: Big;
  profit: Big;
}

export interface OpenLotRow {
  stock: Stock;
  lot: OpenLot;
  /** The oldest open lot of its stock: the next sale takes from it. */
  soldNext: boolean;
}

export interface SaleRow {
  stock: Stock;
  sale: Sale;
}

export interface HistoryRow {
  trade: Trade;
  stock: Stock | undefined;
}

function visibleStocks(stocks: readonly Stock[], { stockId }: LedgerFilter): readonly Stock[] {
  return stockId ? stocks.filter((s) => s.id === stockId) : stocks;
}

/** A share counts for a date range when it was bought or sold inside it. */
function matchesSheetFilter(row: ShareRow, filter: LedgerFilter): boolean {
  if (filter.status === 'open' && row.sell) return false;
  if (filter.status === 'closed' && !row.sell) return false;
  return (
    isWithinDates(row.buy.tradedOn, filter) ||
    (!!row.sell && isWithinDates(row.sell.tradedOn, filter))
  );
}

export function sheetGroups(
  stocks: readonly Stock[],
  rowsByStock: Map<string, ShareRow[]>,
  filter: LedgerFilter,
): SheetGroup[] {
  return visibleStocks(stocks, filter)
    .map((stock) => {
      const rows = (rowsByStock.get(stock.id) ?? []).filter((row) =>
        matchesSheetFilter(row, filter),
      );
      const group: SheetGroup = {
        stock,
        rows,
        sold: new Big(0),
        open: new Big(0),
        openCost: new Big(0),
        profit: new Big(0),
      };
      for (const row of rows) {
        if (row.sell) {
          group.sold = group.sold.plus(row.quantity);
          group.profit = group.profit.plus(row.profit!);
        } else {
          group.open = group.open.plus(row.quantity);
          group.openCost = group.openCost.plus(row.quantity.times(row.buy.price));
        }
      }
      return group;
    })
    .filter((group) => group.rows.length > 0);
}

export function sheetLines(groups: readonly SheetGroup[]): SheetLine[] {
  return groups.flatMap((group) => [
    ...group.rows.map((row, i) => ({ kind: 'share' as const, group, row, number: i + 1 })),
    { kind: 'subtotal' as const, group },
  ]);
}

export function sheetTotals(groups: readonly SheetGroup[]): SheetTotals {
  return groups.reduce(
    (total, g) => ({
      sold: total.sold.plus(g.sold),
      open: total.open.plus(g.open),
      profit: total.profit.plus(g.profit),
    }),
    { sold: new Big(0), open: new Big(0), profit: new Big(0) },
  );
}

export function openLotRows(
  stocks: readonly Stock[],
  ledger: Ledger,
  filter: LedgerFilter,
): OpenLotRow[] {
  return visibleStocks(stocks, filter).flatMap((stock) =>
    (ledger.get(stock.id)?.openLots ?? [])
      .map((lot, index) => ({ stock, lot, soldNext: index === 0 }))
      .filter((row) => isWithinDates(row.lot.buy.tradedOn, filter)),
  );
}

/** Newest sale first. */
export function saleRows(
  stocks: readonly Stock[],
  ledger: Ledger,
  filter: LedgerFilter,
): SaleRow[] {
  return visibleStocks(stocks, filter)
    .flatMap((stock) => (ledger.get(stock.id)?.sales ?? []).map((sale) => ({ stock, sale })))
    .filter((row) => isWithinDates(row.sale.sell.tradedOn, filter))
    .sort((a, b) => compareTrades(b.sale.sell, a.sale.sell));
}

/** Newest trade first. */
export function historyRows(
  stocks: readonly Stock[],
  trades: readonly Trade[],
  filter: LedgerFilter,
): HistoryRow[] {
  const byId = new Map(stocks.map((s) => [s.id, s]));
  return trades
    .filter(
      (t) =>
        (!filter.stockId || t.stockId === filter.stockId) &&
        (filter.side === 'all' || t.side === filter.side) &&
        isWithinDates(t.tradedOn, filter),
    )
    .map((trade) => ({ trade, stock: byId.get(trade.stockId) }))
    .sort((a, b) => compareTrades(b.trade, a.trade));
}
