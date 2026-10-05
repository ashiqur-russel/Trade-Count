import { openMemoryDatabase } from './memory-database.fixture.js';
import { PortfolioDatabase } from './portfolio-database.js';

/** A device whose clock only moves when told to, so "newest edit wins" is deterministic. */
export function device(startMinute: number) {
  const sqlite = openMemoryDatabase();
  let minute = startMinute;
  const store = new PortfolioDatabase(sqlite, { now: () => new Date(Date.UTC(2026, 9, 5, 10, minute)) });
  return { sqlite, store, at: (m: number) => void (minute = m) };
}

/** Pushes `from`'s data to `to` the way the app will: snapshot → (encrypted) → merge on the receiver. */
export function sync(from: PortfolioDatabase, to: PortfolioDatabase) {
  return to.syncWith(JSON.parse(JSON.stringify(from.exportVault())));
}
