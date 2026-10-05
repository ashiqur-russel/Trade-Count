import type { VaultSnapshot } from '@trade-count/local-store';

/** A canonical string for a snapshot, so two snapshots with the same content compare equal whatever their ordering. */
export function fingerprint(snapshot: VaultSnapshot): string {
  const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return JSON.stringify({
    stocks: [...snapshot.stocks].sort(byId).map((s) => [s.id, s.name, s.symbol, s.updatedAt]),
    trades: [...snapshot.trades]
      .sort(byId)
      .map((t) => [t.id, t.stockId, t.side, t.quantity, t.price, t.tradedOn, t.createdAt, t.updatedAt]),
    deletions: snapshot.deletions.map((d) => `${d.kind}:${d.id}:${d.deletedAt}`).sort(),
  });
}
