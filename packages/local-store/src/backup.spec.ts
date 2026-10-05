import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, backupFileName, parseBackup } from './backup.js';
import { StoreError } from './store-error.js';

const stock = { id: 's1', name: 'Advanced Micro Devices', symbol: 'AMD' };
const trade = (id: string, side: 'buy' | 'sell', quantity: string, tradedOn: string) => ({
  id,
  stockId: 's1',
  side,
  quantity,
  price: '560.10',
  tradedOn,
  createdAt: `${tradedOn}T10:00:00.000Z`,
});
const backup = (changes: Record<string, unknown> = {}) => ({
  format: BACKUP_FORMAT,
  version: 1,
  exportedAt: '2026-10-05T12:00:00.000Z',
  stocks: [stock],
  trades: [trade('t1', 'buy', '3', '2026-10-01'), trade('t2', 'sell', '2', '2026-10-02')],
  ...changes,
});

function rejection(input: unknown): string {
  try {
    parseBackup(input);
  } catch (error) {
    if (error instanceof StoreError) return error.message;
    throw error;
  }
  throw new Error('Expected the backup to be rejected');
}

describe('parseBackup', () => {
  it('accepts a valid backup and normalises its values', () => {
    const parsed = parseBackup(backup());

    expect(parsed.stocks).toEqual([stock]);
    expect(parsed.trades[0]).toMatchObject({ quantity: '3', price: '560.1' });
  });

  it('rejects files that are not Trade Count backups or come from a newer version', () => {
    expect(rejection({ hello: 'world' })).toBe("This file isn't a Trade Count backup.");
    expect(rejection([])).toBe("This file isn't a Trade Count backup.");
    expect(rejection(backup({ version: 2 }))).toMatch(/newer version of Trade Count/);
  });

  it('names the damaged record and the rule it breaks', () => {
    expect(rejection(backup({ trades: [{ ...trade('t1', 'buy', '3', '2026-10-01'), price: '-5' }] }))).toBe(
      'Trade 1 in this backup: Enter a price above 0, with up to 4 decimals.',
    );
    expect(rejection(backup({ stocks: [{ ...stock, name: '' }] }))).toMatch(/^Stock 1 in this backup/);
  });

  it('rejects duplicates, orphan trades and stock names that clash by case', () => {
    expect(rejection(backup({ trades: [trade('t1', 'buy', '1', '2026-10-01'), trade('t1', 'buy', '1', '2026-10-01')] }))).toBe(
      'This backup lists the same trade twice.',
    );
    expect(rejection(backup({ stocks: [stock, { id: 's2', name: 'advanced micro devices', symbol: null }] }))).toBe(
      'This backup lists the same stock name twice.',
    );
    expect(rejection(backup({ stocks: [] }))).toBe('This backup has a trade for a stock that is not in it.');
  });

  it('rejects a history that sells shares that were not held', () => {
    expect(rejection(backup({ trades: [trade('t1', 'sell', '1', '2026-10-01')] }))).toBe(
      "This backup sells Advanced Micro Devices shares that weren't held on 2026-10-01.",
    );
  });

  it('names backup files by export date', () => {
    expect(backupFileName(new Date('2026-10-05T12:00:00Z'))).toBe('trade-count-backup-2026-10-05.json');
  });
});
