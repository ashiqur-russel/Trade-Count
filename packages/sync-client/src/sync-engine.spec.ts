import { VaultDecryptError } from "@trade-count/sync-crypto";
import { StoreError } from "@trade-count/local-store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { syncOnce, type SyncOptions } from "./sync-engine.js";
import { VaultGoneError, VaultNotFoundError } from "./sync-errors.js";
import {
  apiFor,
  createDevice,
  createServer,
  newCredentials,
} from "./two-devices.fixture.js";
import type { VaultApi } from "./vault-api.js";

describe("syncOnce with two devices through the real server handler", () => {
  let server: ReturnType<typeof createServer>;
  let phone: ReturnType<typeof createDevice>;
  let laptop: ReturnType<typeof createDevice>;
  let credentials: Awaited<ReturnType<typeof newCredentials>>;
  let phoneApi: VaultApi;
  let laptopApi: VaultApi;

  beforeEach(async () => {
    server = createServer();
    phone = createDevice(1);
    laptop = createDevice(1);
    credentials = await newCredentials();
    phoneApi = apiFor(credentials, server, phone);
    laptopApi = apiFor(credentials, server, laptop);
  });
  afterEach(() => {
    phone.sqlite.close();
    laptop.sqlite.close();
  });

  const sync = (
    d: ReturnType<typeof createDevice>,
    api: VaultApi,
    options?: SyncOptions,
  ) => syncOnce(d.device, api, credentials, options);
  const buy = (
    d: ReturnType<typeof createDevice>,
    stockId: string,
    quantity: string,
    tradedOn: string,
  ) =>
    d.store.createTrade({
      stockId,
      side: "buy",
      quantity,
      price: "10",
      tradedOn,
    });

  it("uploads the first device and lets a second device join with the same key", async () => {
    const tesla = phone.store.createStock({
      name: "Tesla Inc.",
      symbol: "TSLA",
    });
    buy(phone, tesla.id, "5", "2026-01-23");

    const first = await sync(phone, phoneApi);
    const joined = await sync(laptop, laptopApi, { requireExisting: true });

    expect(first).toEqual({
      pulled: false,
      pushed: true,
      version: 1,
      clockOffsetMs: null,
    });
    expect(joined).toMatchObject({ pulled: true, pushed: false, version: 1 });
    expect(laptop.store.getPortfolio()).toEqual(phone.store.getPortfolio());
  });

  it("keeps ciphertext only on the server", async () => {
    const tesla = phone.store.createStock({ name: "Tesla Inc." });
    buy(phone, tesla.id, "5", "2026-01-23");

    await sync(phone, phoneApi);

    expect(
      [...server.store.vaults.values()].every(
        (v) => !JSON.stringify(v).includes("Tesla"),
      ),
    ).toBe(true);
  });

  it("converges after both devices edit: each sync pulls what the other pushed", async () => {
    const acme = phone.store.createStock({ name: "Acme" });
    await sync(phone, phoneApi);
    await sync(laptop, laptopApi);
    phone.at(5);
    laptop.at(6);
    buy(phone, acme.id, "2", "2026-10-01");
    buy(laptop, acme.id, "3", "2026-10-02");

    await sync(phone, phoneApi);
    await sync(laptop, laptopApi);
    await sync(phone, phoneApi);

    expect(phone.store.getPortfolio().trades).toHaveLength(2);
    expect(phone.store.getPortfolio()).toEqual(laptop.store.getPortfolio());
  });

  it("does not upload again when nothing changed anywhere", async () => {
    phone.store.createStock({ name: "Acme" });
    await sync(phone, phoneApi);
    const putsAfterFirst = server.requests.filter((r) =>
      r.startsWith("PUT"),
    ).length;

    const again = await sync(phone, phoneApi);
    await sync(laptop, laptopApi);
    const laptopAgain = await sync(laptop, laptopApi);

    expect(again).toMatchObject({ pulled: false, pushed: false });
    expect(laptopAgain).toMatchObject({ pulled: false, pushed: false });
    expect(server.requests.filter((r) => r.startsWith("PUT")).length).toBe(
      putsAfterFirst,
    );
  });

  it("retries and merges when another device saved between this device's read and write", async () => {
    const acme = phone.store.createStock({ name: "Acme" });
    await sync(phone, phoneApi);
    await sync(laptop, laptopApi);
    phone.at(5);
    laptop.at(6);
    buy(phone, acme.id, "2", "2026-10-01");
    buy(laptop, acme.id, "3", "2026-10-02");

    let raced = false;
    const racing: VaultApi = {
      ...phoneApi,
      put: async (base, envelope) => {
        if (!raced) {
          raced = true;
          await sync(laptop, laptopApi);
        }
        return phoneApi.put(base, envelope);
      },
    };
    const outcome = await sync(phone, racing);

    expect(raced).toBe(true);
    expect(outcome).toMatchObject({ pulled: true, pushed: true, version: 3 });
    expect(phone.store.getPortfolio().trades).toHaveLength(2);
    await sync(laptop, laptopApi);
    expect(laptop.store.getPortfolio()).toEqual(phone.store.getPortfolio());
  });

  it("refuses to join when no vault exists for the key and leaves local data alone", async () => {
    laptop.store.createStock({ name: "Local only" });

    await expect(
      sync(laptop, laptopApi, { requireExisting: true }),
    ).rejects.toBeInstanceOf(VaultNotFoundError);
    expect(laptop.store.getPortfolio().stocks.map((s) => s.name)).toEqual([
      "Local only",
    ]);
    expect(server.store.vaults.size).toBe(0);
  });

  it("fails with a decrypt error when the server data was written under a different key", async () => {
    phone.store.createStock({ name: "Acme" });
    await sync(phone, phoneApi);
    const otherKey = await newCredentials();

    await expect(
      syncOnce(laptop.device, laptopApi, {
        ...credentials,
        encryptionKey: otherKey.encryptionKey,
      }),
    ).rejects.toBeInstanceOf(VaultDecryptError);
  });

  it("refuses a merge that would oversell and changes nothing on this device", async () => {
    const acme = phone.store.createStock({ name: "Acme" });
    buy(phone, acme.id, "3", "2026-10-01");
    await sync(phone, phoneApi);
    await sync(laptop, laptopApi);
    phone.at(5);
    laptop.at(6);
    phone.store.createTrade({
      stockId: acme.id,
      side: "sell",
      quantity: "3",
      price: "11",
      tradedOn: "2026-10-03",
    });
    laptop.store.createTrade({
      stockId: acme.id,
      side: "sell",
      quantity: "2",
      price: "11",
      tradedOn: "2026-10-04",
    });
    await sync(phone, phoneApi);
    const before = laptop.store.exportVault();

    const failure = await sync(laptop, laptopApi).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(StoreError);
    expect((failure as StoreError).code).toBe("CONFLICT");
    expect(laptop.store.exportVault()).toEqual(before);
  });

  describe("after a refused merge", () => {
    async function conflictingSales() {
      const acme = phone.store.createStock({ name: "Acme" });
      buy(phone, acme.id, "3", "2026-10-01");
      await sync(phone, phoneApi);
      await sync(laptop, laptopApi);
      phone.at(5);
      laptop.at(6);
      phone.store.createTrade({ stockId: acme.id, side: "sell", quantity: "3", price: "11", tradedOn: "2026-10-03" });
      laptop.store.createTrade({ stockId: acme.id, side: "sell", quantity: "2", price: "11", tradedOn: "2026-10-04" });
      await sync(phone, phoneApi);
      await expect(sync(laptop, laptopApi)).rejects.toBeInstanceOf(StoreError);
    }
    const sold = (d: ReturnType<typeof createDevice>) =>
      d.store.getPortfolio().trades.filter((t) => t.side === "sell").map((t) => t.quantity);

    it("keeping this device uploads its version, and the other device then pulls it", async () => {
      await conflictingSales();
      laptop.at(10);

      const outcome = await sync(laptop, laptopApi, { resolveConflict: "keep-this-device" });
      phone.at(11);
      await sync(phone, phoneApi);

      expect(outcome).toMatchObject({ pushed: true });
      expect(sold(laptop)).toEqual(["2"]);
      expect(sold(phone)).toEqual(["2"]);
    });

    it("using the synced copy adopts it and uploads nothing", async () => {
      await conflictingSales();
      const versionBefore = server.store.vaults.values().next().value!.version;

      const outcome = await sync(laptop, laptopApi, { resolveConflict: "use-synced-copy" });

      expect(outcome).toMatchObject({ pulled: true, pushed: false, version: versionBefore });
      expect(sold(laptop)).toEqual(["3"]);
    });

    it("an ordinary sync after resolving finds nothing left to merge", async () => {
      await conflictingSales();
      await sync(laptop, laptopApi, { resolveConflict: "use-synced-copy" });

      await expect(sync(laptop, laptopApi)).resolves.toMatchObject({ pushed: false });
    });
  });

  describe("when sync was turned off on another device", () => {
    it("does not re-create the deleted vault from a device that had synced before", async () => {
      const acme = phone.store.createStock({ name: "Acme" });
      buy(phone, acme.id, "2", "2026-10-01");
      await sync(phone, phoneApi);
      await sync(laptop, laptopApi, { wasSynced: false });
      await phoneApi.delete();
      const before = laptop.store.getPortfolio();

      await expect(
        sync(laptop, laptopApi, { wasSynced: true }),
      ).rejects.toBeInstanceOf(VaultGoneError);

      expect(server.store.vaults.size).toBe(0);
      expect(laptop.store.getPortfolio()).toEqual(before);
    });

    it("still creates the vault for a device that has never synced", async () => {
      phone.store.createStock({ name: "Acme" });

      await sync(phone, phoneApi, { wasSynced: false });

      expect(server.store.vaults.size).toBe(1);
    });

    it("treats a vault deleted between reading and writing as turned off, not as lost", async () => {
      const acme = phone.store.createStock({ name: "Acme" });
      await sync(phone, phoneApi);
      await sync(laptop, laptopApi);
      laptop.at(6);
      buy(laptop, acme.id, "1", "2026-10-02");
      const deleting: VaultApi = {
        ...laptopApi,
        put: async (base, envelope) => {
          await phoneApi.delete();
          return laptopApi.put(base, envelope);
        },
      };

      await expect(
        sync(laptop, deleting, { wasSynced: true }),
      ).rejects.toBeInstanceOf(VaultGoneError);

      expect(server.store.vaults.size).toBe(0);
      expect(laptop.store.getPortfolio().trades).toHaveLength(1);
    });
  });

  describe("devices with a wrong clock", () => {
    const YEARS_4 = 2_100_000; // minutes: a phone whose clock is about four years ahead

    it("reports how far this device is from the server, and nothing when the server sends no time", async () => {
      phone.store.createStock({ name: "Acme" });

      expect((await sync(phone, phoneApi)).clockOffsetMs).toBeNull();

      server.setRealMinute(5);
      phone.at(65);
      const outcome = await sync(phone, phoneApi);
      expect(outcome.clockOffsetMs).toBeGreaterThan(-61 * 60_000 - 2000);
      expect(outcome.clockOffsetMs).toBeLessThan(-59 * 60_000 + 2000);
    });

    it("lets a later edit from a correct clock win over an earlier edit from a wrong clock", async () => {
      const acme = phone.store.createStock({ name: "Acme" });
      const trade = buy(phone, acme.id, "1", "2026-10-01");
      server.setRealMinute(1);
      await sync(phone, phoneApi);
      await sync(laptop, laptopApi);

      phone.at(YEARS_4 + 2);
      phone.store.updateTrade(trade.id, { price: "99" });
      server.setRealMinute(5);
      phone.at(YEARS_4 + 5);
      await sync(phone, phoneApi);
      laptop.at(5);
      await sync(laptop, laptopApi);
      expect(laptop.store.getPortfolio().trades[0]!.price).toBe("99");

      laptop.at(10);
      laptop.store.updateTrade(trade.id, { price: "12" });
      server.setRealMinute(10);
      await sync(laptop, laptopApi);
      server.setRealMinute(11);
      phone.at(YEARS_4 + 11);
      await sync(phone, phoneApi);

      expect(phone.store.getPortfolio().trades[0]!.price).toBe("12");
      expect(laptop.store.getPortfolio().trades[0]!.price).toBe("12");
    });
  });

  it("deletes the server copy without touching local data", async () => {
    phone.store.createStock({ name: "Acme" });
    await sync(phone, phoneApi);

    await phoneApi.delete();

    expect(server.store.vaults.size).toBe(0);
    expect(phone.store.getPortfolio().stocks).toHaveLength(1);
  });
});
