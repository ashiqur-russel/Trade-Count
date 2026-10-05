import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Portfolio, Trade } from '@trade-count/ledger';
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

describe('PortfolioStore', () => {
  let store: PortfolioStore;
  let http: HttpTestingController;

  async function loadWith(portfolio: Portfolio): Promise<void> {
    const loading = store.load();
    http.expectOne('/api/portfolio').flush(portfolio);
    await loading;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PortfolioStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(PortfolioStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the portfolio and derives FIFO totals from it', async () => {
    await loadWith({ stocks: [acme], trades: [buy] });

    expect(store.loadStatus()).toBe('ready');
    expect(store.totals().held.toString()).toBe('3');
    expect(store.totals().openCost.toString()).toBe('1680');
  });

  it('shows a new trade immediately and swaps in the saved one when the API confirms', async () => {
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

    http
      .expectOne({ method: 'POST', url: '/api/trades' })
      .flush({ ...buy, id: 's1', side: 'sell', quantity: '2', price: '600' });
    expect(await saving).toEqual({ ok: true });
    expect(store.trades().map((t) => t.id)).toEqual(['b1', 's1']);
  });

  it('removes the optimistic trade and returns the API message when the save is rejected', async () => {
    await loadWith({ stocks: [acme], trades: [buy] });

    const saving = store.addTrade({
      stockId: 'acme',
      side: 'sell',
      quantity: '1',
      price: '600',
      tradedOn: '2026-10-02',
    });
    http
      .expectOne('/api/trades')
      .flush(
        { message: 'You only hold 0 Acme share(s) on 2026-10-02.' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(await saving).toEqual({
      ok: false,
      message: 'You only hold 0 Acme share(s) on 2026-10-02.',
    });
    expect(store.trades()).toEqual([buy]);
  });

  it('refuses an oversell locally without calling the API', async () => {
    await loadWith({ stocks: [acme], trades: [buy] });

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
    http.expectNone('/api/trades');
  });

  it('puts a deleted trade back in its place when the delete fails', async () => {
    const second = { ...buy, id: 'b2', tradedOn: '2026-10-03' };
    await loadWith({ stocks: [acme], trades: [buy, second] });

    const deleting = store.deleteTrade('b1');
    expect(store.trades()).toEqual([second]);
    http.expectOne('/api/trades/b1').flush(null, { status: 500, statusText: 'Server Error' });

    expect((await deleting).ok).toBe(false);
    expect(store.trades()).toEqual([buy, second]);
  });

  it('restores the previous values when an edit is rejected', async () => {
    await loadWith({ stocks: [acme], trades: [buy] });

    const saving = store.updateTrade('b1', { price: '500' });
    expect(store.trades()[0].price).toBe('500');
    http
      .expectOne('/api/trades/b1')
      .flush({ message: 'nope' }, { status: 400, statusText: 'Bad Request' });

    await saving;
    expect(store.trades()[0].price).toBe('560');
  });

  it('rejects a stock name that only differs in case without calling the API', async () => {
    await loadWith({ stocks: [acme], trades: [] });

    expect(await store.addStock({ name: ' ACME ' })).toEqual({
      ok: false,
      message: 'ACME is already in your list.',
    });
    http.expectNone('/api/stocks');
  });
});
