import type { SyncedStock, SyncedTrade, VaultSnapshot } from './vault-snapshot.js';

/** What each side holds that the other doesn't, as lines a person can read when choosing which side to keep. */
export interface VaultDifference {
  onThisDevice: string[];
  onSyncedCopy: string[];
}

export function diffVaults(
  here: VaultSnapshot,
  there: VaultSnapshot,
  formatDate: (isoDate: string) => string = (isoDate) => isoDate,
): VaultDifference {
  return {
    onThisDevice: changesIn(here, there, formatDate),
    onSyncedCopy: changesIn(there, here, formatDate),
  };
}

/** Changes `mine` has made relative to `other`: records added or edited, and records deleted. */
function changesIn(mine: VaultSnapshot, other: VaultSnapshot, formatDate: (isoDate: string) => string): string[] {
  const otherStocks = new Map(other.stocks.map((s) => [s.id, s]));
  const otherTrades = new Map(other.trades.map((t) => [t.id, t]));
  const otherDeleted = new Set(other.deletions.map((d) => `${d.kind}:${d.id}`));
  const myDeleted = new Set(mine.deletions.map((d) => `${d.kind}:${d.id}`));
  const stockName = (id: string) =>
    mine.stocks.find((s) => s.id === id)?.name ?? other.stocks.find((s) => s.id === id)?.name ?? 'unknown stock';
  const tradeLine = (t: SyncedTrade) =>
    `${t.side === 'buy' ? 'Buy' : 'Sale'} ${t.quantity} × ${stockName(t.stockId)} @ ${t.price} on ${formatDate(t.tradedOn)}`;

  const lines: string[] = [];
  for (const stock of mine.stocks) {
    const counterpart = otherStocks.get(stock.id);
    if (!counterpart && !otherDeleted.has(`stock:${stock.id}`)) lines.push(`Added stock ${stock.name}`);
    else if (counterpart && stockDiffers(stock, counterpart)) lines.push(`Different version of stock: ${stock.name}`);
  }
  for (const trade of mine.trades) {
    const counterpart = otherTrades.get(trade.id);
    if (!counterpart && !otherDeleted.has(`trade:${trade.id}`)) lines.push(`Added: ${tradeLine(trade)}`);
    else if (counterpart && tradeDiffers(trade, counterpart)) lines.push(`Different version: ${tradeLine(trade)}`);
  }
  for (const stock of other.stocks) {
    if (myDeleted.has(`stock:${stock.id}`) && !mine.stocks.some((s) => s.id === stock.id)) lines.push(`Deleted stock ${stock.name}`);
  }
  for (const trade of other.trades) {
    if (myDeleted.has(`trade:${trade.id}`) && !mine.trades.some((t) => t.id === trade.id)) lines.push(`Deleted: ${tradeLine(trade)}`);
  }
  return lines;
}

function stockDiffers(a: SyncedStock, b: SyncedStock): boolean {
  return a.name !== b.name || a.symbol !== b.symbol;
}

function tradeDiffers(a: SyncedTrade, b: SyncedTrade): boolean {
  return (
    a.stockId !== b.stockId ||
    a.side !== b.side ||
    a.quantity !== b.quantity ||
    a.price !== b.price ||
    a.tradedOn !== b.tradedOn
  );
}
