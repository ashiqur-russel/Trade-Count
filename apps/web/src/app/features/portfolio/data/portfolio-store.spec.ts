import { TestBed } from '@angular/core/testing';
import type { Portfolio, Trade } from '@trade-count/ledger';
import { PersistentStorage } from '../../../core/storage/persistent-storage';
import { PortfolioDb, PortfolioDbError } from './portfolio-db';
import type { PortfolioDbMethod } from './portfolio-db-protocol';
import { PortfolioStore } from './portfolio-store';

const acme = { id: 'acme', name: 'Acme', symbol: null };
const buy: Trade = {
  id: 'b1',
  stockId: 'acme',
  side: 'buy',
  quantity: '3',
  price: '560',
  tradedOn: '2026-10-01',
  createdAt: '2026-10-01T10:00:00.000Z',
};

/** Stands in for the worker: each call waits until the test settles it. */
class FakeDb {
  readonly calls: {
    method: PortfolioDbMethod;
    args: unknown[];
    settle: (outcome: unknown) => void;
  }[] = [];

  call(method: PortfolioDbMethod, ...args: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.calls.push({
        method,
        args,
        settle: (outcome) =>
          outcome instanceof PortfolioDbError ? reject(outcome) : resolve(outcome),
      });
    });
  }

  last() {
    return this.calls.at(-1)!;
  }
}

describe('PortfolioStore', () => {
  let store: PortfolioStore;
  let db: FakeDb;
  let persistRequests: number;

  async function loadWith(portfolio: Portfolio): Promise<void> {
    const loading = store.load();
    db.last().settle(portfolio);
    await loading;
  }

  beforeEach(() => {
    db = new FakeDb();
    persistRequests = 0;
    TestBed.configureTestingModule({
      providers: [
        PortfolioStore,
        { provide: PortfolioDb, useValue: db },
        { provide: PersistentStorage, useValue: { request: async () => void persistRequests++ } },
      ],
    });
    store = TestBed.inject(PortfolioStore);
  });

  it('loads the portfolio and derives FIFO totals from it', async () => {
    await loadWith({ stocks: [acme], trades: [buy] });

    expect(store.loadStatus()).toBe('ready');
    expect(store.totals().held.toString()).toBe('3');
    expect(store.totals().openCost.toString()).toBe('1680');
  });

  it('shows the storage problem when the database cannot be opened', async () => {
    const loading = store.load();
    db.last().settle(
      new PortfolioDbError({
        code: 'UNAVAILABLE',
        message: "Couldn't open your data on this device.",
      }),
    );
    await loading;

    expect(store.loadStatus()).toBe('error');
    expect(store.loadError()).toBe("Couldn't open your data on this device.");
  });

  it('shows a new trade immediately, swaps in the saved one and asks to keep storage', async () => {
    await loadWith({ stocks: [acme], trades: [buy] });

    const saving = store.addTrade({
      stockId: 'acme',
      side: 'sell',
      quantity: '2',
      price: '600',
      tradedOn: '2026-10-02',
    });
    expect(store.trades()).toHaveLength(2);
    expect(store.totals().realizedProfit.toString()).toBe('80');
    expect(db.last().method).toBe('createTrade');

    db.last().settle({ ...buy, id: 's1', side: 'sell', quantity: '2', price: '600' });
    expect(await saving).toEqual({ ok: true });
    expect(store.trades().map((t) => t.id)).toEqual(['b1', 's1']);
    expect(persistRequests).toBe(1);
  });

  it('removes the optimistic trade and returns the database message when the save is refused', async () => {
    await loadWith({ stocks: [acme], trades: [buy] });

    const saving = store.addTrade({
      stockId: 'acme',
      side: 'sell',
      quantity: '1',
      price: '600',
      tradedOn: '2026-10-02',
    });
    db.last().settle(
      new PortfolioDbError({ code: 'CONFLICT', message: 'You only hold 0 Acme share(s).' }),
    );

    expect(await saving).toEqual({ ok: false, message: 'You only hold 0 Acme share(s).' });
    expect(store.trades()).toEqual([buy]);
  });

  it('refuses an oversell before touching the database', async () => {
    await loadWith({ stocks: [acme], trades: [buy] });
    const callsBefore = db.calls.length;

    const result = await store.addTrade({
      stockId: 'acme',
      side: 'sell',
      quantity: '4',
      price: '600',
      tradedOn: '2026-10-02',
    });

    expect(result).toEqual({
      ok: false,
      message: "You only hold 3 Acme share(s) on 02.10.2026, so you can't sell 4.",
    });
    expect(db.calls.length).toBe(callsBefore);
  });

  it('puts a deleted trade back in its place when the delete fails', async () => {
    const second = { ...buy, id: 'b2', tradedOn: '2026-10-03' };
    await loadWith({ stocks: [acme], trades: [buy, second] });

    const deleting = store.deleteTrade('b1');
    expect(store.trades()).toEqual([second]);
    db.last().settle(new PortfolioDbError({ code: 'NOT_FOUND', message: 'Trade not found.' }));

    expect((await deleting).ok).toBe(false);
    expect(store.trades()).toEqual([buy, second]);
  });

  it('restores the previous values when an edit is refused', async () => {
    await loadWith({ stocks: [acme], trades: [buy] });

    const saving = store.updateTrade('b1', { price: '500' });
    expect(store.trades()[0].price).toBe('500');
    db.last().settle(new PortfolioDbError({ code: 'INVALID', message: 'nope' }));

    await saving;
    expect(store.trades()[0].price).toBe('560');
  });

  it('rejects a stock name that only differs in case without touching the database', async () => {
    await loadWith({ stocks: [acme], trades: [] });
    const callsBefore = db.calls.length;

    expect(await store.addStock({ name: ' ACME ' })).toEqual({
      ok: false,
      message: 'ACME is already in your list.',
    });
    expect(db.calls.length).toBe(callsBefore);
  });
});
