import type { Stock, Trade } from './types.js';

export const acme: Stock = { id: 'acme', name: 'Acme', symbol: 'ACM' };
export const globex: Stock = { id: 'globex', name: 'Globex', symbol: null };

let sequence = 0;

export function trade(
  side: Trade['side'],
  quantity: string,
  price: string,
  tradedOn: string,
  overrides: Partial<Trade> = {},
): Trade {
  sequence++;
  return {
    id: `t${String(sequence).padStart(4, '0')}`,
    stockId: acme.id,
    side,
    quantity,
    price,
    tradedOn,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, sequence)).toISOString(),
    ...overrides,
  };
}
