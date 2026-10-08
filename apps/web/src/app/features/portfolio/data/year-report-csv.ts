import type { YearReport } from '@trade-count/ledger';

const SEPARATOR = ';';

/**
 * The year's sales, one line per FIFO lot, in the format German Excel and Numbers open directly:
 * semicolons between columns, decimal commas and a byte-order mark for UTF-8.
 */
export function yearReportCsv(report: YearReport): string {
  const header = [
    'Sale date',
    'Stock',
    'Shares',
    'Sale price',
    'Bought on',
    'Buy price',
    'Profit per share',
    'Tax per share',
    'Sale profit',
    'Sale tax',
    'Sale after tax',
    'Covered by loss pot',
    'Loss pot after',
  ];
  const lines = report.sales.flatMap((sale) =>
    sale.lots.map((lot) => [
      sale.sell.tradedOn,
      sale.stock.name,
      decimal(lot.quantity),
      decimal(sale.salePrice),
      lot.buy.tradedOn,
      decimal(lot.buyPrice),
      decimal(lot.profitPerShare),
      lot.taxPerShare ? decimal(lot.taxPerShare) : '',
      decimal(sale.profit),
      decimal(sale.tax),
      decimal(sale.afterTax),
      decimal(sale.covered),
      decimal(sale.potAfter),
    ]),
  );
  return (
    '﻿' + [header, ...lines].map((cells) => cells.map(cell).join(SEPARATOR)).join('\r\n') + '\r\n'
  );
}

export function yearReportFileName(year: number): string {
  return `trade-count-sales-${year}.csv`;
}

function decimal(value: { toFixed(dp?: number): string }): string {
  return value.toFixed().replace('.', ',');
}

function cell(text: string): string {
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
