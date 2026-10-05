import { Injectable, computed, inject, signal, type WritableSignal } from '@angular/core';
import {
  computeLedger,
  describeOversell,
  findOversellCausedBy,
  portfolioTotals,
  shareRows,
  type Stock,
  type Trade,
  type TradeChange,
} from '@trade-count/ledger';
import { firstValueFrom, type Observable } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api-error-message';
import {
  PortfolioApi,
  type NewStock,
  type NewTrade,
  type StockChanges,
  type TradeChanges,
} from '../../../core/api/portfolio-api';
import { formatIsoDate } from '../../../shared/dates/iso-date';

export type MutationResult = { ok: true } | { ok: false; message: string };

type LoadStatus = 'loading' | 'ready' | 'error';
interface Identified {
  id: string;
}

let pendingSequence = 0;
const nextPendingId = () => `pending-${pendingSequence++}`;

/**
 * Single source of portfolio state for the page. Writes apply locally first and roll back
 * just the affected item if the API rejects them.
 */
@Injectable()
export class PortfolioStore {
  private readonly api = inject(PortfolioApi);

  private readonly stockList = signal<Stock[]>([]);
  private readonly tradeList = signal<Trade[]>([]);
  private readonly pendingIds = signal<ReadonlySet<string>>(new Set());

  readonly loadStatus = signal<LoadStatus>('loading');
  readonly loadError = signal<string | null>(null);
  /** Failures from actions that have no form of their own to show them (table deletes). */
  readonly notice = signal<string | null>(null);

  readonly stocks = computed(() =>
    [...this.stockList()].sort((a, b) => a.name.localeCompare(b.name, 'de')),
  );
  readonly trades = this.tradeList.asReadonly();
  readonly ledger = computed(() => computeLedger(this.stockList(), this.tradeList()));
  readonly totals = computed(() => portfolioTotals(this.ledger()));
  readonly shareRows = computed(() => shareRows(this.stockList(), this.tradeList()));

  isPending(id: string): boolean {
    return this.pendingIds().has(id);
  }

  async load(): Promise<void> {
    this.loadStatus.set('loading');
    try {
      const portfolio = await firstValueFrom(this.api.getPortfolio());
      this.stockList.set(portfolio.stocks);
      this.tradeList.set(portfolio.trades);
      this.loadStatus.set('ready');
    } catch (error) {
      this.loadError.set(apiErrorMessage(error));
      this.loadStatus.set('error');
    }
  }

  /** The FIFO check the API will also run, answered before any request is sent. */
  findOversellMessage(change: TradeChange, changedTradeId: string): string | null {
    const oversell = findOversellCausedBy(this.stockList(), this.tradeList(), change);
    return oversell ? describeOversell(oversell, changedTradeId, formatIsoDate) : null;
  }

  addStock(input: NewStock): Promise<MutationResult> {
    const name = input.name.trim();
    if (this.stockList().some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return Promise.resolve({ ok: false, message: `${name} is already in your list.` });
    }
    const draft: Stock = {
      id: nextPendingId(),
      name,
      symbol: input.symbol?.trim().toUpperCase() || null,
    };
    return this.create(this.stockList, draft, this.api.createStock({ name, symbol: input.symbol }));
  }

  updateStock(id: string, changes: StockChanges): Promise<MutationResult> {
    const name = changes.name?.trim();
    if (
      name &&
      this.stockList().some((s) => s.id !== id && s.name.toLowerCase() === name.toLowerCase())
    ) {
      return Promise.resolve({ ok: false, message: `${name} is already in your list.` });
    }
    return this.update<Stock>(this.stockList, id, changes, this.api.updateStock(id, changes));
  }

  deleteStock(id: string): Promise<MutationResult> {
    if (this.tradeList().some((t) => t.stockId === id)) {
      return Promise.resolve({
        ok: false,
        message: 'This stock still has trades. Delete its trades first.',
      });
    }
    return this.remove(this.stockList, id, this.api.deleteStock(id));
  }

  addTrade(input: NewTrade): Promise<MutationResult> {
    const draft: Trade = { ...input, id: nextPendingId(), createdAt: new Date().toISOString() };
    const oversell = this.findOversellMessage({ type: 'add', trade: draft }, draft.id);
    if (oversell) return Promise.resolve({ ok: false, message: oversell });
    return this.create(this.tradeList, draft, this.api.createTrade(input));
  }

  updateTrade(id: string, changes: TradeChanges): Promise<MutationResult> {
    const current = this.tradeList().find((t) => t.id === id);
    if (!current) return Promise.resolve({ ok: false, message: 'That trade no longer exists.' });
    const oversell = this.findOversellMessage(
      { type: 'update', trade: { ...current, ...changes } },
      id,
    );
    if (oversell) return Promise.resolve({ ok: false, message: oversell });
    return this.update<Trade>(this.tradeList, id, changes, this.api.updateTrade(id, changes));
  }

  deleteTrade(id: string): Promise<MutationResult> {
    const oversell = this.findOversellMessage({ type: 'remove', tradeId: id }, id);
    if (oversell) return Promise.resolve({ ok: false, message: oversell });
    return this.remove(this.tradeList, id, this.api.deleteTrade(id));
  }

  private async create<T extends Identified>(
    list: WritableSignal<T[]>,
    draft: T,
    request: Observable<T>,
  ): Promise<MutationResult> {
    list.update((items) => [...items, draft]);
    return this.settle(draft.id, request, {
      saved: (saved) => list.update((items) => items.map((i) => (i.id === draft.id ? saved : i))),
      failed: () => list.update((items) => items.filter((i) => i.id !== draft.id)),
    });
  }

  private async update<T extends Identified>(
    list: WritableSignal<T[]>,
    id: string,
    changes: Partial<T>,
    request: Observable<T>,
  ): Promise<MutationResult> {
    const previous = list().find((i) => i.id === id);
    if (!previous) return { ok: false, message: 'That item no longer exists.' };
    const optimistic = { ...previous, ...changes };
    list.update((items) => items.map((i) => (i.id === id ? optimistic : i)));
    return this.settle(id, request, {
      saved: (saved) => list.update((items) => items.map((i) => (i.id === id ? saved : i))),
      failed: () => list.update((items) => items.map((i) => (i === optimistic ? previous : i))),
    });
  }

  private async remove<T extends Identified>(
    list: WritableSignal<T[]>,
    id: string,
    request: Observable<unknown>,
  ): Promise<MutationResult> {
    const index = list().findIndex((i) => i.id === id);
    if (index === -1) return { ok: true };
    const removed = list()[index];
    list.update((items) => items.filter((i) => i.id !== id));
    return this.settle(id, request, {
      saved: () => undefined,
      failed: () =>
        list.update((items) => [...items.slice(0, index), removed, ...items.slice(index)]),
    });
  }

  private async settle<R>(
    id: string,
    request: Observable<R>,
    on: { saved: (result: R) => void; failed: () => void },
  ): Promise<MutationResult> {
    this.pendingIds.update((ids) => new Set(ids).add(id));
    try {
      on.saved(await firstValueFrom(request));
      return { ok: true };
    } catch (error) {
      on.failed();
      return { ok: false, message: apiErrorMessage(error) };
    } finally {
      this.pendingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }
  }
}
