import type { Trade } from '@trade-count/ledger';

export interface NewStock {
  name: string;
  symbol?: string | null;
}
export type StockChanges = Partial<NewStock>;

export type NewTrade = Pick<Trade, 'stockId' | 'side' | 'quantity' | 'price' | 'tradedOn'>;
export type TradeChanges = Partial<NewTrade>;
