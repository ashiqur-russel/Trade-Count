import type { Database } from "@sqlite.org/sqlite-wasm";
import { afterEach, describe, expect, it } from "vitest";
import { openMemoryDatabase } from "./memory-database.fixture.js";
import { PortfolioDatabase } from "./portfolio-database.js";

const T = (time: string) => Date.parse(`2026-10-05T${time}:00.000Z`);
const FUTURE = "2030-01-01T10:00:00.000Z";

/** A device whose raw clock is set by the test, as a phone with a wrong clock would have. */
function device(rawClock: string) {
  const sqlite = openMemoryDatabase();
  let now = Date.parse(rawClock);
  const store = new PortfolioDatabase(sqlite, { now: () => new Date(now) });
  return {
    sqlite,
    store,
    setClock: (iso: string) => void (now = Date.parse(iso)),
  };
}

describe("clock handling", () => {
  const open: Database[] = [];
  const track = (d: ReturnType<typeof device>) => (open.push(d.sqlite), d);
  afterEach(() => open.splice(0).forEach((db) => db.close()));

  const tradeOf = (d: ReturnType<typeof device>) =>
    d.store.exportVault().trades[0]!;
  const push = (
    from: ReturnType<typeof device>,
    to: ReturnType<typeof device>,
  ) => to.store.syncWith(JSON.parse(JSON.stringify(from.store.exportVault())));
  const seed = (d: ReturnType<typeof device>) => {
    const acme = d.store.createStock({ name: "Acme" });
    return d.store.createTrade({
      stockId: acme.id,
      side: "buy",
      quantity: "1",
      price: "10",
      tradedOn: "2026-10-01",
    });
  };

  it("stamps edits with corrected time once the device learns how far its clock is off", () => {
    const phone = track(device(FUTURE));
    const trade = seed(phone);

    phone.store.setClockOffset(T("10:00") - Date.parse(FUTURE));
    phone.store.updateTrade(trade.id, { price: "99" });

    const stamp = Date.parse(tradeOf(phone).updatedAt);
    expect(stamp).toBeLessThan(T("10:00") + 61_000);
    expect(stamp).toBeGreaterThan(T("09:59"));
  });

  it("ignores offsets below the measurement noise and keeps real ones across reopening", () => {
    const d = track(device("2026-10-05T10:00:00.000Z"));

    d.store.setClockOffset(3_000);
    expect(d.store.clockOffset()).toBe(0);

    d.store.setClockOffset(120_000);
    expect(new PortfolioDatabase(d.sqlite).clockOffset()).toBe(120_000);
  });

  it("a later edit on a correct clock still wins after a wrong-clock device edited the same trade", () => {
    const laptop = track(device("2026-10-05T10:00:00.000Z"));
    const phone = track(device("2030-01-01T10:00:00.000Z"));
    const trade = seed(laptop);
    push(laptop, phone);

    phone.setClock("2030-01-01T10:02:00.000Z");
    phone.store.updateTrade(trade.id, { price: "99" });

    // The phone syncs at real time 10:05 and learns from the server that its clock is ~3.2 years ahead.
    phone.setClock("2030-01-01T10:05:00.000Z");
    phone.store.setClockOffset(
      T("10:05") - Date.parse("2030-01-01T10:05:00.000Z"),
    );
    push(laptop, phone);
    laptop.setClock("2026-10-05T10:05:00.000Z");
    push(phone, laptop);
    expect(tradeOf(laptop).price).toBe("99");

    laptop.setClock("2026-10-05T10:10:00.000Z");
    laptop.store.updateTrade(trade.id, { price: "12" });
    phone.setClock("2030-01-01T10:11:00.000Z");
    push(laptop, phone);
    laptop.setClock("2026-10-05T10:11:00.000Z");
    push(phone, laptop);

    expect(tradeOf(laptop).price).toBe("12");
    expect(tradeOf(phone).price).toBe("12");
  });

  it("a deletion made on a wrong clock does not block later edits from other devices", () => {
    const laptop = track(device("2026-10-05T10:00:00.000Z"));
    const phone = track(device("2030-01-01T10:00:00.000Z"));
    const trade = seed(laptop);
    push(laptop, phone);

    phone.setClock("2030-01-01T10:20:00.000Z");
    phone.store.deleteTrade(trade.id);
    phone.setClock("2030-01-01T10:21:00.000Z");
    phone.store.setClockOffset(
      T("10:21") - Date.parse("2030-01-01T10:21:00.000Z"),
    );
    push(laptop, phone);
    expect(
      Date.parse(phone.store.exportVault().deletions[0]!.deletedAt),
    ).toBeLessThanOrEqual(T("10:21"));

    laptop.setClock("2026-10-05T10:22:00.000Z");
    laptop.store.updateTrade(trade.id, { price: "12" });
    laptop.store.syncWith(
      JSON.parse(JSON.stringify(phone.store.exportVault())),
    );

    expect(laptop.store.getPortfolio().trades).toHaveLength(1);
    expect(tradeOf(laptop).price).toBe("12");
  });

  it("caps absurd times claimed by another device at a minute ahead of this clock", () => {
    const laptop = track(device("2026-10-05T10:00:00.000Z"));
    const phone = track(device(FUTURE));
    const trade = seed(laptop);
    push(laptop, phone);
    phone.store.updateTrade(trade.id, { price: "99" });
    const poisoned = phone.store.exportVault();
    poisoned.trades[0]!.updatedAt = "9999-12-31T00:00:00.000Z";

    laptop.store.syncWith(JSON.parse(JSON.stringify(poisoned)));

    expect(Date.parse(tradeOf(laptop).updatedAt)).toBeLessThanOrEqual(
      T("10:00") + 60_000,
    );
  });

  it("stamps an edit after anything it has already seen, even when this clock is behind", () => {
    const laptop = track(device("2026-10-05T10:00:00.000Z"));
    const trade = seed(laptop);
    const remote = laptop.store.exportVault();
    remote.trades[0]!.updatedAt = "2026-10-05T10:00:30.000Z";
    remote.trades[0]!.price = "50";
    laptop.store.syncWith(JSON.parse(JSON.stringify(remote)));

    laptop.setClock("2026-10-05T10:00:10.000Z");
    laptop.store.updateTrade(trade.id, { price: "60" });

    expect(Date.parse(tradeOf(laptop).updatedAt)).toBeGreaterThan(
      T("10:00") + 30_000,
    );
    expect(tradeOf(laptop).price).toBe("60");
  });
});
