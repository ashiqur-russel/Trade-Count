import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Portfolio, Stock, Trade } from '@trade-count/ledger';
import type { Observable } from 'rxjs';

export interface NewStock {
  name: string;
  symbol?: string | null;
}
export type StockChanges = Partial<NewStock>;

export type NewTrade = Pick<Trade, 'stockId' | 'side' | 'quantity' | 'price' | 'tradedOn'>;
export type TradeChanges = Partial<NewTrade>;

@Injectable({ providedIn: 'root' })
export class PortfolioApi {
  private readonly http = inject(HttpClient);

  getPortfolio(): Observable<Portfolio> {
    return this.http.get<Portfolio>('/api/portfolio');
  }

  createStock(stock: NewStock): Observable<Stock> {
    return this.http.post<Stock>('/api/stocks', stock);
  }

  updateStock(id: string, changes: StockChanges): Observable<Stock> {
    return this.http.patch<Stock>(`/api/stocks/${id}`, changes);
  }

  deleteStock(id: string): Observable<void> {
    return this.http.delete<void>(`/api/stocks/${id}`);
  }

  createTrade(trade: NewTrade): Observable<Trade> {
    return this.http.post<Trade>('/api/trades', trade);
  }

  updateTrade(id: string, changes: TradeChanges): Observable<Trade> {
    return this.http.patch<Trade>(`/api/trades/${id}`, changes);
  }

  deleteTrade(id: string): Observable<void> {
    return this.http.delete<void>(`/api/trades/${id}`);
  }
}
