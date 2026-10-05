import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openMemoryDatabase } from './memory-database.fixture.js';
import { PortfolioDatabase } from './portfolio-database.js';
import { StoreError } from './store-error.js';

function failure(action: () => unknown): { code: string; message: string } {
  try {
    action();
  } catch (error) {
    if (error instanceof StoreError) return error.toFailure();
    throw error;
  }
  throw new Error('Expected a StoreError');
}

describe('PortfolioDatabase', () => {
  let sqlite: Database;
  let store: PortfolioDatabase;

  beforeEach(() => {
    sqlite = openMemoryDatabase();
    store = new PortfolioDatabase(sqlite);
  });
  afterEach(() => sqlite.close());

  describe('stocks', () => {
    it('saves a trimmed name and upper-cased symbol, empty symbol as null', () => {
      const amd = store.createStock({ name: '  Advanced Micro Devices ', symbol: ' amd ' });
      const sap = store.createStock({ name: 'SAP', symbol: '' });

      expect(amd).toMatchObject({ name: 'Advanced Micro Devices', symbol: 'AMD' });
      expect(sap.symbol).toBeNull();
      expect(store.getPortfolio().stocks.map((s) => s.name)).toEqual(['Advanced Micro Devices', 'SAP']);
    });

    it('rejects a name that only differs in case, also when renaming', () => {
      store.createStock({ name: 'Allianz' });
      const bayer = store.createStock({ name: 'Bayer' });

      expect(failure(() => store.createStock({ name: 'ALLIANZ' }))).toEqual({
        code: 'CONFLICT',
        message: 'ALLIANZ is already in your list.',
      });
      expect(failure(() => store.updateStock(bayer.id, { name: 'allianz' })).code).toBe('CONFLICT');
      expect(store.updateStock(bayer.id, { name: 'BAYER' }).name).toBe('BAYER');
    });

    it('rejects blank names and invalid symbols', () => {
      expect(failure(() => store.createStock({ name: '   ' })).code).toBe('INVALID');
      expect(failure(() => store.createStock({ name: 'X', symbol: 'not valid!' })).code).toBe('INVALID');
    });

    it('refuses to delete a stock that still has trades', () => {
      const bmw = store.createStock({ name: 'BMW' });
      store.createTrade({ stockId: bmw.id, side: 'buy', quantity: '1', price: '80', tradedOn: '2026-10-01' });

      expect(failure(() => store.deleteStock(bmw.id))).toEqual({
        code: 'CONFLICT',
        message: 'This stock still has trades. Delete its trades first.',
      });
    });

    it('deletes a stock without trades and reports a missing one', () => {
      const bayer = store.createStock({ name: 'Bayer' });
      store.deleteStock(bayer.id);

      expect(failure(() => store.deleteStock(bayer.id)).code).toBe('NOT_FOUND');
    });
  });

  describe('trades', () => {
    let stockId: string;
    const add = (side: 'buy' | 'sell', quantity: string, price: string, tradedOn: string) =>
      store.createTrade({ stockId, side, quantity, price, tradedOn });

    beforeEach(() => {
      stockId = store.createStock({ name: 'Acme' }).id;
    });

    it('stores decimals exactly in canonical form', () => {
      expect(add('buy', '3.000', '560.10', '2026-10-01')).toMatchObject({ quantity: '3', price: '560.1' });
    });

    it('allows selling the shares held and rejects selling more, naming how many were held', () => {
      add('buy', '3', '560', '2026-10-01');
      add('sell', '2', '600', '2026-10-02');

      expect(failure(() => add('sell', '2', '600', '2026-10-03'))).toEqual({
        code: 'CONFLICT',
        message: "You only hold 1 Acme share(s) on 2026-10-03, so you can't sell 2.",
      });
    });

    it('rejects a sale dated before the shares were bought', () => {
      add('buy', '1', '560', '2026-10-05');

      expect(failure(() => add('sell', '1', '600', '2026-10-04')).code).toBe('CONFLICT');
    });

    it('refuses to delete or shrink a buy whose shares were sold, but allows a price fix', () => {
      const buy = add('buy', '3', '560', '2026-10-01');
      const sell = add('sell', '2', '600', '2026-10-02');

      expect(failure(() => store.deleteTrade(buy.id)).code).toBe('CONFLICT');
      expect(failure(() => store.updateTrade(buy.id, { quantity: '1' })).code).toBe('CONFLICT');
      expect(store.updateTrade(buy.id, { price: '555.5' })).toMatchObject({ quantity: '3', price: '555.5' });

      store.deleteTrade(sell.id);
      store.deleteTrade(buy.id);
      expect(store.getPortfolio().trades).toEqual([]);
    });

    it('rejects zero, too many decimals, impossible dates and unknown stocks', () => {
      expect(failure(() => add('buy', '0', '560', '2026-10-01')).code).toBe('INVALID');
      expect(failure(() => add('buy', '1', '560.12345', '2026-10-01')).code).toBe('INVALID');
      expect(failure(() => add('buy', '1', '560', '2026-02-30')).code).toBe('INVALID');
      expect(
        failure(() => store.createTrade({ stockId: 'missing', side: 'buy', quantity: '1', price: '1', tradedOn: '2026-10-01' })),
      ).toEqual({ code: 'NOT_FOUND', message: 'Stock not found.' });
    });

    it('gives same-day trades strictly increasing entry times so FIFO order is stable', () => {
      const fixedNow = new Date('2026-10-05T10:00:00.000Z');
      const frozen = new PortfolioDatabase(sqlite, { now: () => fixedNow });
      const first = frozen.createTrade({ stockId, side: 'buy', quantity: '1', price: '1', tradedOn: '2026-10-05' });
      const second = frozen.createTrade({ stockId, side: 'buy', quantity: '1', price: '2', tradedOn: '2026-10-05' });

      expect(Date.parse(second.createdAt)).toBeGreaterThan(Date.parse(first.createdAt));
    });

    it('formats dates in messages with the given formatter', () => {
      const german = new PortfolioDatabase(sqlite, { formatDate: (iso) => iso.split('-').reverse().join('.') });

      expect(
        failure(() => german.createTrade({ stockId, side: 'sell', quantity: '1', price: '1', tradedOn: '2026-10-02' })).message,
      ).toBe("You only hold 0 Acme share(s) on 02.10.2026, so you can't sell 1.");
    });
  });

  describe('backups', () => {
    it('round-trips everything through a backup and remembers when it was taken', () => {
      const at = new Date('2026-10-05T12:00:00.000Z');
      const source = new PortfolioDatabase(sqlite, { now: () => at });
      const acme = source.createStock({ name: 'Acme', symbol: 'ACM' });
      source.createTrade({ stockId: acme.id, side: 'buy', quantity: '3', price: '10.5', tradedOn: '2026-10-01' });
      source.createTrade({ stockId: acme.id, side: 'sell', quantity: '1', price: '12', tradedOn: '2026-10-02' });

      expect(source.lastBackupAt()).toBeNull();
      const backup = JSON.parse(JSON.stringify(source.exportBackup()));
      expect(source.lastBackupAt()).toBe('2026-10-05T12:00:00.000Z');

      const target = openMemoryDatabase();
      const restored = new PortfolioDatabase(target).restoreBackup(backup);
      expect(restored).toEqual(source.getPortfolio());
      expect(new PortfolioDatabase(target).lastBackupAt()).toBe('2026-10-05T12:00:00.000Z');
      target.close();
    });

    it('replaces existing data and keeps working with the restored trades', () => {
      const old = store.createStock({ name: 'Old' });
      store.createTrade({ stockId: old.id, side: 'buy', quantity: '1', price: '1', tradedOn: '2026-01-01' });

      store.restoreBackup({
        format: 'trade-count-backup',
        version: 1,
        exportedAt: '2026-10-05T12:00:00.000Z',
        stocks: [{ id: 's1', name: 'Acme', symbol: null }],
        trades: [{ id: 't1', stockId: 's1', side: 'buy', quantity: '2', price: '5', tradedOn: '2026-10-01', createdAt: '2026-10-01T09:00:00.000Z' }],
      });

      expect(store.getPortfolio().stocks.map((s) => s.name)).toEqual(['Acme']);
      expect(failure(() => store.createTrade({ stockId: 's1', side: 'sell', quantity: '3', price: '6', tradedOn: '2026-10-02' })).code).toBe('CONFLICT');
    });

    it('leaves current data untouched when a backup is rejected', () => {
      const acme = store.createStock({ name: 'Acme' });

      expect(failure(() => store.restoreBackup({ format: 'something-else' })).code).toBe('INVALID');
      expect(store.getPortfolio().stocks).toEqual([acme]);
    });
  });

  it('keeps data when the database is reopened', () => {
    const stock = store.createStock({ name: 'Acme' });
    store.createTrade({ stockId: stock.id, side: 'buy', quantity: '2', price: '10', tradedOn: '2026-10-01' });

    const reopened = new PortfolioDatabase(sqlite);

    expect(reopened.getPortfolio().trades).toHaveLength(1);
  });
});
