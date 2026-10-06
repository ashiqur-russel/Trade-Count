import { describe, expect, it } from 'vitest';
import { acme, globex, trade } from './trades.fixture.js';
import { reportYears, yearReport } from './year-report.js';

const RATE = '0.26375';

/** The sample year used in the Reports design. */
function sampleYear() {
  return [
    trade('buy', '5', '100', '2026-01-12'),
    trade('buy', '10', '50', '2026-02-10', { stockId: globex.id }),
    trade('buy', '3', '110', '2026-03-03'),
    trade('sell', '4', '120', '2026-04-14'),
    trade('buy', '4', '95', '2026-05-20'),
    trade('sell', '3', '105', '2026-08-02'),
    trade('sell', '6', '58', '2026-09-15', { stockId: globex.id }),
  ];
}

const money = (value: { toFixed(dp: number): string }) => value.toFixed(2);

describe('yearReport', () => {
  it('adds up invested, profit, loss, estimated tax and the after-tax result for the year', () => {
    const report = yearReport([acme, globex], sampleYear(), 2026, RATE);

    expect(money(report.totals.invested)).toBe('1710.00');
    expect(money(report.totals.soldFor)).toBe('1143.00');
    expect(money(report.totals.profit)).toBe('128.00');
    expect(money(report.totals.loss)).toBe('-5.00');
    expect(money(report.totals.tax)).toBe('33.76');
    expect(money(report.totals.afterTax)).toBe('89.24');
    expect(report.buyCount).toBe(4);
  });

  it('taxes each profitable sale on its total, rounded to the cent, and shows the tax per share', () => {
    const [april, , september] = yearReport([acme, globex], sampleYear(), 2026, RATE).sales;

    expect(money(april!.tax)).toBe('21.10');
    expect(money(april!.lots[0]!.profitPerShare)).toBe('20.00');
    expect(money(april!.lots[0]!.taxPerShare!)).toBe('5.28');
    expect(money(september!.tax)).toBe('12.66');
    expect(money(september!.lots[0]!.taxPerShare!)).toBe('2.11');
  });

  it('charges no tax on a sale that is a loss overall, even when one of its lots made a profit', () => {
    const august = yearReport([acme, globex], sampleYear(), 2026, RATE).sales[1]!;

    expect(august.lots.map((lot) => [lot.quantity.toString(), money(lot.profitPerShare)])).toEqual([
      ['1', '5.00'],
      ['2', '-5.00'],
    ]);
    expect(money(august.profit)).toBe('-5.00');
    expect(money(august.tax)).toBe('0.00');
    expect(august.lots.every((lot) => lot.taxPerShare === null)).toBe(true);
  });

  it('puts buys and sales in the month they happened and keeps a running after-tax total', () => {
    const { months } = yearReport([acme, globex], sampleYear(), 2026, RATE);

    expect(months.filter((m) => m.hasTrades).map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 8, 9]);
    expect(money(months[0]!.invested)).toBe('500.00');
    expect(money(months[3]!.afterTax)).toBe('58.90');
    expect([4, 8, 9, 12].map((m) => money(months[m - 1]!.runningAfterTax))).toEqual(['58.90', '53.90', '89.24', '89.24']);
  });

  it('picks the best month, counts profitable and losing sales and the after-tax result per share sold', () => {
    const report = yearReport([acme, globex], sampleYear(), 2026, RATE);

    expect(report.bestMonth?.month).toBe(4);
    expect([report.profitableSales, report.losingSales]).toEqual([2, 1]);
    expect(money(report.afterTaxPerShareSold!)).toBe('6.86');
  });

  it('splits the year by stock', () => {
    const [acmeFigures, globexFigures] = yearReport([acme, globex], sampleYear(), 2026, RATE).byStock;

    expect([acmeFigures!.stock.name, money(acmeFigures!.afterTax)]).toEqual(['Acme', '53.90']);
    expect([globexFigures!.stock.name, money(globexFigures!.afterTax)]).toEqual(['Globex', '35.34']);
  });

  it('uses lots bought in earlier years but reports only the chosen year', () => {
    const trades = [trade('buy', '2', '100', '2025-12-01'), trade('sell', '2', '130', '2026-01-05')];

    const report2026 = yearReport([acme], trades, 2026, RATE);
    const report2025 = yearReport([acme], trades, 2025, RATE);

    expect(money(report2026.totals.profit)).toBe('60.00');
    expect(money(report2026.totals.invested)).toBe('0.00');
    expect(report2025.sales).toHaveLength(0);
    expect(money(report2025.totals.invested)).toBe('200.00');
  });

  it('follows the tax rate it is given, including zero', () => {
    expect(money(yearReport([acme, globex], sampleYear(), 2026, '0').totals.tax)).toBe('0.00');
    expect(money(yearReport([acme, globex], sampleYear(), 2026, '0.27995').totals.tax)).toBe('35.84');
  });

  it('has no best month and no per-share figure in a year without sales', () => {
    const report = yearReport([acme], [trade('buy', '1', '10', '2026-03-01')], 2026, RATE);

    expect(report.bestMonth).toBeNull();
    expect(report.afterTaxPerShareSold).toBeNull();
  });
});

describe('reportYears', () => {
  it('lists the years that have trades, newest first', () => {
    expect(reportYears([trade('buy', '1', '1', '2024-05-01'), trade('buy', '1', '1', '2026-01-01'), trade('sell', '1', '1', '2026-02-01')])).toEqual([2026, 2024]);
  });
});
