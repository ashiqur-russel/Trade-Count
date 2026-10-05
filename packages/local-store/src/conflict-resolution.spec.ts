import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { device, sync } from './device.fixture.js';
import { diffVaults } from './vault-diff.js';

describe('resolving a refused merge', () => {
  let phone: ReturnType<typeof device>;
  let laptop: ReturnType<typeof device>;
  const open: Database[] = [];

  beforeEach(() => {
    phone = device(1);
    laptop = device(1);
    open.push(phone.sqlite, laptop.sqlite);
  });
  afterEach(() => open.splice(0).forEach((db) => db.close()));

  /** Both devices start in sync with one buy of 3; then the phone sells 3 and the laptop sells 2: too many together. */
  function conflictingSales() {
    const acme = phone.store.createStock({ name: 'Acme' });
    phone.store.createTrade({ stockId: acme.id, side: 'buy', quantity: '3', price: '10', tradedOn: '2026-10-01' });
    sync(phone.store, laptop.store);
    phone.at(4);
    laptop.at(5);
    phone.store.createTrade({ stockId: acme.id, side: 'sell', quantity: '3', price: '11', tradedOn: '2026-10-03' });
    laptop.store.createTrade({ stockId: acme.id, side: 'sell', quantity: '2', price: '12', tradedOn: '2026-10-04' });
    expect(() => sync(phone.store, laptop.store)).toThrow(/conflict/);
  }

  const snapshotOf = (d: ReturnType<typeof device>) => JSON.parse(JSON.stringify(d.store.exportVault()));
  const soldQuantities = (d: ReturnType<typeof device>) =>
    d.store
      .getPortfolio()
      .trades.filter((t) => t.side === 'sell')
      .map((t) => t.quantity);

  it("keeping this device's version replaces the synced copy, and the other device then converges to it", () => {
    conflictingSales();
    laptop.at(10);

    const resolved = laptop.store.resolveConflict(snapshotOf(phone), 'keep-this-device');
    expect(soldQuantities(laptop)).toEqual(['2']);
    expect(resolved.trades.filter((t) => t.side === 'sell')).toHaveLength(1);

    phone.at(11);
    sync(laptop.store, phone.store);
    expect(soldQuantities(phone)).toEqual(['2']);
    expect(phone.store.getPortfolio()).toEqual(laptop.store.getPortfolio());
  });

  it('using the synced copy replaces this device\'s data, and the other device is unaffected', () => {
    conflictingSales();
    const phoneBefore = phone.store.getPortfolio();

    laptop.store.resolveConflict(snapshotOf(phone), 'use-synced-copy');

    expect(soldQuantities(laptop)).toEqual(['3']);
    expect(laptop.store.getPortfolio()).toEqual(phoneBefore);
    laptop.at(12);
    phone.at(12);
    sync(laptop.store, phone.store);
    expect(phone.store.getPortfolio()).toEqual(phoneBefore);
  });

  it('keeping this device deletes what only the synced copy had, so it stays deleted after a later merge', () => {
    conflictingSales();
    laptop.at(10);
    laptop.store.resolveConflict(snapshotOf(phone), 'keep-this-device');

    phone.at(11);
    sync(laptop.store, phone.store);
    sync(phone.store, laptop.store);

    expect(soldQuantities(laptop)).toEqual(['2']);
    expect(soldQuantities(phone)).toEqual(['2']);
  });

  it('refuses a synced copy that is itself invalid instead of adopting it', () => {
    const acme = phone.store.createStock({ name: 'Acme' });
    const snapshot = snapshotOf(phone);
    snapshot.trades.push({
      id: 'x'.repeat(8),
      stockId: acme.id,
      side: 'sell',
      quantity: '5',
      price: '1',
      tradedOn: '2026-10-01',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    });

    expect(() => laptop.store.resolveConflict(snapshot, 'use-synced-copy')).toThrow();
    expect(laptop.store.getPortfolio().stocks).toEqual([]);
  });
});

describe('diffVaults', () => {
  let phone: ReturnType<typeof device>;
  let laptop: ReturnType<typeof device>;
  const open: Database[] = [];

  beforeEach(() => {
    phone = device(1);
    laptop = device(1);
    open.push(phone.sqlite, laptop.sqlite);
  });
  afterEach(() => open.splice(0).forEach((db) => db.close()));

  it('lists each side\'s own sales in words, with dates in the caller\'s format', () => {
    const acme = phone.store.createStock({ name: 'Acme' });
    phone.store.createTrade({ stockId: acme.id, side: 'buy', quantity: '3', price: '10', tradedOn: '2026-10-01' });
    sync(phone.store, laptop.store);
    phone.at(4);
    laptop.at(5);
    phone.store.createTrade({ stockId: acme.id, side: 'sell', quantity: '3', price: '11', tradedOn: '2026-10-03' });
    laptop.store.createTrade({ stockId: acme.id, side: 'sell', quantity: '2', price: '12', tradedOn: '2026-10-04' });
    const german = (iso: string) => iso.split('-').reverse().join('.');

    const difference = diffVaults(laptop.store.exportVault(), phone.store.exportVault(), german);

    expect(difference.onThisDevice).toEqual(['Added: Sale 2 × Acme @ 12 on 04.10.2026']);
    expect(difference.onSyncedCopy).toEqual(['Added: Sale 3 × Acme @ 11 on 03.10.2026']);
  });

  it('reports a trade deleted on one side as a deletion there, not as an addition on the other', () => {
    const acme = phone.store.createStock({ name: 'Acme' });
    const buy = phone.store.createTrade({ stockId: acme.id, side: 'buy', quantity: '3', price: '10', tradedOn: '2026-10-01' });
    sync(phone.store, laptop.store);
    phone.at(4);
    phone.store.deleteTrade(buy.id);

    const difference = diffVaults(laptop.store.exportVault(), phone.store.exportVault());

    expect(difference.onThisDevice).toEqual([]);
    expect(difference.onSyncedCopy).toEqual(['Deleted: Buy 3 × Acme @ 10 on 2026-10-01']);
  });

  it('shows both versions of a trade that was edited on one side', () => {
    const acme = phone.store.createStock({ name: 'Acme' });
    const buy = phone.store.createTrade({ stockId: acme.id, side: 'buy', quantity: '3', price: '10', tradedOn: '2026-10-01' });
    sync(phone.store, laptop.store);
    phone.at(4);
    phone.store.updateTrade(buy.id, { price: '11' });

    const difference = diffVaults(laptop.store.exportVault(), phone.store.exportVault());

    expect(difference.onThisDevice).toEqual(['Different version: Buy 3 × Acme @ 10 on 2026-10-01']);
    expect(difference.onSyncedCopy).toEqual(['Different version: Buy 3 × Acme @ 11 on 2026-10-01']);
  });
});
