import { Big, computeLedger } from '@trade-count/ledger';
import { levelRows, positionFigures } from './position-figures';

const ledger = computeLedger(
  [{ id: 'n', name: 'NVIDIA', symbol: 'NVDA' }],
  [
    {
      id: 'b',
      stockId: 'n',
      side: 'buy',
      quantity: '39',
      price: '212.45',
      tradedOn: '2026-09-24',
      createdAt: '2026-09-24T10:00:00Z',
    },
  ],
);
const figures = positionFigures(ledger.get('n')!, new Big('204.60'))!;

describe('positionFigures / levelRows', () => {
  it('values the holding at the typed price', () => {
    expect(figures.result.toFixed(2)).toBe('-306.15');
    expect(figures.resultRatio.times(100).toFixed(1)).toBe('-3.7');
  });

  it('places the average and today among the levels, highest first, with the P/L at each', () => {
    const rows = levelRows(
      {
        heldAction: '',
        plan: [],
        levels: [
          { name: 'R2', usd: 250 },
          { name: 'S2', usd: 227 },
        ],
      },
      figures,
      1.1206,
    );
    expect(rows.map((r) => r.name)).toEqual(['R2', 'Your average buy', 'Now', 'S2']);
    expect(rows[3]!.profit.toFixed(2)).toBe('-385.32');
    expect(rows[1]!.change).toBeNull();
  });
});
