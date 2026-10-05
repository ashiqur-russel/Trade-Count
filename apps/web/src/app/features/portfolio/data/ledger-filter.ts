import type { TradeSide } from '@trade-count/ledger';

export interface LedgerFilter {
  stockId: string | null;
  /** Inclusive `YYYY-MM-DD` bounds; null leaves that side open. */
  from: string | null;
  to: string | null;
  status: 'all' | 'open' | 'closed';
  side: 'all' | TradeSide;
}

export const NO_FILTER: LedgerFilter = {
  stockId: null,
  from: null,
  to: null,
  status: 'all',
  side: 'all',
};

export function isWithinDates(isoDate: string, { from, to }: LedgerFilter): boolean {
  return (!from || isoDate >= from) && (!to || isoDate <= to);
}

export function isFiltered(filter: LedgerFilter): boolean {
  return (Object.keys(NO_FILTER) as (keyof LedgerFilter)[]).some(
    (key) => filter[key] !== NO_FILTER[key],
  );
}

export type LedgerTab = 'sheet' | 'lots' | 'sales' | 'history';
