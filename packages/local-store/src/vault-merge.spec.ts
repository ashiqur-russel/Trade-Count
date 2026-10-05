import { describe, expect, it } from 'vitest';
import { StoreError } from './store-error.js';
import { mergeVaults } from './vault-merge.js';
import { VAULT_DATA_FORMAT, VAULT_DATA_VERSION, type VaultSnapshot } from './vault-snapshot.js';

const T = (minute: number) => `2026-10-05T10:${String(minute).padStart(2, '0')}:00.000Z`;
const stock = (id: string, name: string, updatedAt = T(0)) => ({ id, name, symbol: null, updatedAt });
const trade = (id: string, side: 'buy' | 'sell', quantity: string, tradedOn: string, updatedAt = T(0), stockId = 's1') => ({
  id,
  stockId,
  side,
  quantity,
  price: '10',
  tradedOn,
  createdAt: `${tradedOn}T09:00:00.000Z`,
  updatedAt,
});
const vault = (parts: Partial<VaultSnapshot>): VaultSnapshot => ({
  format: VAULT_DATA_FORMAT,
  version: VAULT_DATA_VERSION,
  stocks: [],
  trades: [],
  deletions: [],
  ...parts,
});
const del = (kind: 'stock' | 'trade', id: string, deletedAt: string) => ({ kind, id, deletedAt });

describe('mergeVaults', () => {
  it('combines records that exist on only one device', () => {
    const a = vault({ stocks: [stock('s1', 'Acme')], trades: [trade('t1', 'buy', '2', '2026-10-01')] });
    const b = vault({ stocks: [stock('s1', 'Acme')], trades: [trade('t2', 'buy', '3', '2026-10-02')] });

    expect(mergeVaults(a, b).trades.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('keeps the newer edit of a record edited on both devices', () => {
    const a = vault({ stocks: [stock('s1', 'Acme Corp', T(5))] });
    const b = vault({ stocks: [stock('s1', 'Acme Inc', T(9))] });

    expect(mergeVaults(a, b).stocks[0]!.name).toBe('Acme Inc');
  });

  it('gives the same result whichever device syncs first', () => {
    const a = vault({
      stocks: [stock('s1', 'Acme', T(1)), stock('s2', 'Tesla', T(2))],
      trades: [trade('t1', 'buy', '2', '2026-10-01', T(3))],
      deletions: [del('trade', 't9', T(4))],
    });
    const b = vault({
      stocks: [stock('s1', 'Acme Corp', T(5)), stock('s3', 'tesla', T(6))],
      trades: [trade('t2', 'buy', '1', '2026-10-02', T(7)), trade('t1', 'buy', '5', '2026-10-01', T(8))],
      deletions: [del('trade', 't9', T(2))],
    });

    expect(mergeVaults(a, b)).toEqual(mergeVaults(b, a));
  });

  it('is unchanged by merging the same data again', () => {
    const a = vault({ stocks: [stock('s1', 'Acme')], trades: [trade('t1', 'buy', '2', '2026-10-01')] });
    const b = vault({ stocks: [stock('s1', 'Acme', T(4))], trades: [trade('t2', 'buy', '1', '2026-10-02', T(4))] });
    const once = mergeVaults(a, b);

    expect(mergeVaults(once, b)).toEqual(once);
    expect(mergeVaults(once, a)).toEqual(once);
  });

  describe('deletions', () => {
    it('removes a record deleted on the other device after its last edit', () => {
      const a = vault({ stocks: [stock('s1', 'Acme')], trades: [trade('t1', 'buy', '2', '2026-10-01', T(3))] });
      const b = vault({ stocks: [stock('s1', 'Acme')], deletions: [del('trade', 't1', T(8))] });

      const merged = mergeVaults(a, b);

      expect(merged.trades).toEqual([]);
      expect(merged.deletions).toEqual([del('trade', 't1', T(8))]);
    });

    it('keeps a record that was edited after the other device deleted it', () => {
      const a = vault({ stocks: [stock('s1', 'Acme')], trades: [trade('t1', 'buy', '2', '2026-10-01', T(9))] });
      const b = vault({ stocks: [stock('s1', 'Acme')], deletions: [del('trade', 't1', T(4))] });

      const merged = mergeVaults(a, b);

      expect(merged.trades.map((t) => t.id)).toEqual(['t1']);
      expect(merged.deletions).toEqual([]);
    });

    it('keeps a stock when the other device added a trade to it', () => {
      const a = vault({ deletions: [del('stock', 's1', T(8))] });
      const b = vault({ stocks: [stock('s1', 'Acme', T(1))], trades: [trade('t1', 'buy', '2', '2026-10-01', T(5))] });

      const merged = mergeVaults(a, b);

      expect(merged.stocks.map((s) => s.id)).toEqual(['s1']);
      expect(merged.trades.map((t) => t.id)).toEqual(['t1']);
    });

    it('refuses a trade whose stock exists on no device', () => {
      const orphan = vault({ trades: [trade('t1', 'buy', '2', '2026-10-01')] });

      expect(() => mergeVaults(vault({}), orphan)).toThrow(/stock that no longer exists/);
    });
  });

  it('keeps both stocks when two devices each added one with the same name', () => {
    const a = vault({ stocks: [stock('s-a', 'Tesla')] });
    const b = vault({ stocks: [stock('s-b', 'TESLA')] });

    expect(mergeVaults(a, b).stocks.map((s) => [s.id, s.name])).toEqual([
      ['s-a', 'Tesla'],
      ['s-b', 'TESLA (2)'],
    ]);
  });

  describe('FIFO consistency', () => {
    const base = { stocks: [stock('s1', 'Acme')] };

    it('refuses a merge that sells shares that were not held, with the FIFO message', () => {
      const a = vault({ ...base, trades: [trade('b1', 'buy', '3', '2026-10-01'), trade('x1', 'sell', '3', '2026-10-03')] });
      const b = vault({ ...base, trades: [trade('b1', 'buy', '3', '2026-10-01'), trade('x2', 'sell', '2', '2026-10-04')] });

      expect(() => mergeVaults(a, b, (d) => d.split('-').reverse().join('.'))).toThrow(StoreError);
      expect(() => mergeVaults(a, b)).toThrow(/Changes from your other device conflict with this one/);
      expect(() => mergeVaults(a, b, (d) => d.split('-').reverse().join('.'))).toThrow(/04\.10\.2026/);
    });

    it('accepts sales on both devices that fit the shares held', () => {
      const a = vault({ ...base, trades: [trade('b1', 'buy', '5', '2026-10-01'), trade('x1', 'sell', '2', '2026-10-03')] });
      const b = vault({ ...base, trades: [trade('b1', 'buy', '5', '2026-10-01'), trade('x2', 'sell', '3', '2026-10-04')] });

      expect(mergeVaults(a, b).trades).toHaveLength(3);
    });
  });
});
