import type { Oversell } from './oversell.js';

/** User-facing explanation of an oversell; `formatDate` lets each app show dates its own way. */
export function describeOversell(
  { stock, sale }: Oversell,
  changedTradeId: string,
  formatDate: (isoDate: string) => string = (isoDate) => isoDate,
): string {
  const date = formatDate(sale.sell.tradedOn);
  return sale.sell.id === changedTradeId
    ? `You only hold ${sale.matched.toString()} ${stock.name} share(s) on ${date}, so you can't sell ${sale.sell.quantity}.`
    : `This would leave the sale of ${sale.sell.quantity} ${stock.name} share(s) on ${date} without enough shares. Change or delete that sale first.`;
}
