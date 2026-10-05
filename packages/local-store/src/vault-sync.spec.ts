import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openMemoryDatabase } from './memory-database.fixture.js';
import { PortfolioDatabase } from './portfolio-database.js';
import { StoreError } from './store-error.js';
import { VAULT_DATA_FORMAT, parseVaultSnapshot } from './vault-snapshot.js';

/** A device whose clock only moves when told to, so "newest edit wins" is deterministic. */
function device(startMinute: number) {
  const sqlite = openMemoryDatabase();
  let minute = startMinute;
  const store = new PortfolioDatabase(sqlite, { now: () => new Date(Date.UTC(2026, 9, 5, 10, minute)) });
  return { sqlite, store, at: (m: number) => void (minute = m) };
}

/** Pushes `from`'s data to `to` the way the app will: snapshot → (encrypted) → merge on the receiver. */
function sync(from: PortfolioDatabase, to: PortfolioDatabase) {
  return to.syncWith(JSON.parse(JSON.stringify(from.exportVault())));
}

describe('syncing two devices', () => {
  let phone: ReturnType<typeof device>;
  let laptop: ReturnType<typeof device>;
  const open: Database[] = [];

  beforeEach(() => {
    phone = device(1);
    laptop = device(1);
    open.push(phone.sqlite, laptop.sqlite);
  });
  afterEach(() => open.splice(0).forEach((db) => db.close()));

  const buyOn = (d: ReturnType<typeof device>, stockId: string, quantity: string, tradedOn: string) =>
    d.store.createTrade({ stockId, side: 'buy', quantity, price: '10', tradedOn });

  it('brings a new device up to date with everything on the first one', () => {
    const tesla = phone.store.createStock({ name: 'Tesla Inc.', symbol: 'TSLA' });
    buyOn(phone, tesla.id, '5', '2026-01-23');

    sync(phone.store, laptop.store);

    expect(laptop.store.getPortfolio()).toEqual(phone.store.getPortfolio());
  });

  it('merges trades entered on both devices and ends with identical data on both', () => {
    const tesla = phone.store.createStock({ name: 'Tesla Inc.' });
    sync(phone.store, laptop.store);
    phone.at(5);
    laptop.at(6);
    buyOn(phone, tesla.id, '2', '2026-10-01');
    buyOn(laptop, tesla.id, '3', '2026-10-02');

    const merged = sync(laptop.store, phone.store);
    sync(phone.store, laptop.store);

    expect(merged.trades).toHaveLength(2);
    expect(phone.store.getPortfolio()).toEqual(laptop.store.getPortfolio());
  });

  it('carries a deletion to the other device', () => {
    const acme = phone.store.createStock({ name: 'Acme' });
    const trade = buyOn(phone, acme.id, '1', '2026-10-01');
    sync(phone.store, laptop.store);

    phone.at(9);
    phone.store.deleteTrade(trade.id);
    sync(phone.store, laptop.store);

    expect(laptop.store.getPortfolio().trades).toEqual([]);
    expect(laptop.store.exportVault().deletions.map((d) => d.id)).toEqual([trade.id]);
  });

  it('keeps an edit made after the other device deleted the trade', () => {
    const acme = phone.store.createStock({ name: 'Acme' });
    const trade = buyOn(phone, acme.id, '1', '2026-10-01');
    sync(phone.store, laptop.store);

    phone.at(5);
    phone.store.deleteTrade(trade.id);
    laptop.at(9);
    laptop.store.updateTrade(trade.id, { price: '12' });
    sync(phone.store, laptop.store);

    expect(laptop.store.getPortfolio().trades).toHaveLength(1);
    expect(laptop.store.getPortfolio().trades[0]!.price).toBe('12');
  });

  it('refuses a merge that would oversell and leaves the local data exactly as it was', () => {
    const acme = phone.store.createStock({ name: 'Acme' });
    buyOn(phone, acme.id, '3', '2026-10-01');
    sync(phone.store, laptop.store);
    phone.at(4);
    laptop.at(5);
    phone.store.createTrade({ stockId: acme.id, side: 'sell', quantity: '3', price: '11', tradedOn: '2026-10-03' });
    laptop.store.createTrade({ stockId: acme.id, side: 'sell', quantity: '2', price: '11', tradedOn: '2026-10-04' });
    const before = laptop.store.exportVault();

    expect(() => sync(phone.store, laptop.store)).toThrow(/conflict with this one/);
    expect(laptop.store.exportVault()).toEqual(before);
  });

  it('does not let an older device bring back records removed by restoring a backup', () => {
    const old = phone.store.createStock({ name: 'Old Co' });
    buyOn(phone, old.id, '1', '2026-10-01');
    sync(phone.store, laptop.store);

    laptop.at(9);
    laptop.store.restoreBackup({
      format: 'trade-count-backup',
      version: 1,
      exportedAt: '2026-10-05T10:09:00.000Z',
      stocks: [{ id: 's-new', name: 'New Co', symbol: null }],
      trades: [],
    });
    sync(laptop.store, phone.store);
    sync(phone.store, laptop.store);

    expect(phone.store.getPortfolio().stocks.map((s) => s.name)).toEqual(['New Co']);
    expect(laptop.store.getPortfolio()).toEqual(phone.store.getPortfolio());
  });

  it('keeps entry times increasing for trades that arrive by sync', () => {
    const acme = phone.store.createStock({ name: 'Acme' });
    const synced = buyOn(phone, acme.id, '1', '2026-10-05');
    sync(phone.store, laptop.store);

    const local = buyOn(laptop, acme.id, '1', '2026-10-05');

    expect(Date.parse(local.createdAt)).toBeGreaterThan(Date.parse(synced.createdAt));
  });
});

describe('parseVaultSnapshot', () => {
  const valid = {
    format: VAULT_DATA_FORMAT,
    version: 1,
    stocks: [{ id: 's1', name: 'Acme', symbol: null, updatedAt: '2026-10-05T10:00:00Z' }],
    trades: [],
    deletions: [{ kind: 'trade', id: 't9', deletedAt: '2026-10-05T10:01:00Z' }],
  };
  const rejection = (input: unknown) => {
    try {
      parseVaultSnapshot(input);
    } catch (error) {
      if (error instanceof StoreError) return error.message;
      throw error;
    }
    throw new Error('Expected a rejection');
  };

  it('accepts a valid snapshot and normalises times', () => {
    expect(parseVaultSnapshot(valid).stocks[0]!.updatedAt).toBe('2026-10-05T10:00:00.000Z');
  });

  it('rejects wrong formats, newer versions and incomplete data', () => {
    expect(rejection({ hello: 'world' })).toBe("The synced data isn't Trade Count data.");
    expect(rejection({ ...valid, version: 2 })).toMatch(/newer version of Trade Count/);
    expect(rejection({ ...valid, deletions: undefined })).toBe('The synced data is incomplete.');
  });

  it('rejects damaged records and deletions', () => {
    expect(rejection({ ...valid, stocks: [{ ...valid.stocks[0], updatedAt: 'yesterday' }] })).toBe(
      'Stock 1 in the synced data is damaged.',
    );
    expect(rejection({ ...valid, deletions: [{ kind: 'user', id: 'x', deletedAt: '2026-10-05T10:00:00Z' }] })).toBe(
      'Deletion 1 in the synced data is damaged.',
    );
  });
});
