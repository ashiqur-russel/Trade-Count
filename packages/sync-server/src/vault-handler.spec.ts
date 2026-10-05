import {
  deriveCredentials,
  encryptVault,
  generateSyncKey,
  type SyncCredentials,
} from "@trade-count/sync-crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { sha256Hex } from "./hashing.js";
import { MemoryRateLimiter, MemoryVaultStore } from "./memory-adapters.js";
import { LIMITS, handleVaultRequest } from "./vault-handler.js";
import {
  MAX_ENVELOPE_BYTES,
  type ApiError,
  type VaultState,
} from "./vault-protocol.js";

describe("vault API", () => {
  let store: MemoryVaultStore;
  let requestLimiter: MemoryRateLimiter;
  let writeLimiter: MemoryRateLimiter;
  let alice: SyncCredentials;
  let bob: SyncCredentials;
  let clockIso: string;
  let vaultBudgetBytes: number | undefined;

  beforeEach(async () => {
    store = new MemoryVaultStore();
    clockIso = "2026-10-05T12:00:00.000Z";
    vaultBudgetBytes = undefined;
    requestLimiter = new MemoryRateLimiter();
    writeLimiter = new MemoryRateLimiter();
    [alice, bob] = await Promise.all([
      generateSyncKey().then(deriveCredentials),
      generateSyncKey().then(deriveCredentials),
    ]);
  });

  const call = (
    method: string,
    credentials: SyncCredentials,
    body?: unknown,
    ip = "203.0.113.7",
  ) =>
    handleVaultRequest(
      new Request(
        `https://trade-count.test/api/vaults/${credentials.vaultId}`,
        {
          method,
          headers: {
            authorization: `Bearer ${credentials.authToken}`,
            "cf-connecting-ip": ip,
            ...(body === undefined
              ? {}
              : { "content-type": "application/json" }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
      ),
      credentials.vaultId,
      {
        store,
        requestLimiter,
        writeLimiter,
        rateLimitSalt: "test-salt",
        vaultBudgetBytes,
        now: () => new Date(clockIso),
      },
    );

  const put = async (
    credentials: SyncCredentials,
    baseVersion: number,
    text = "portfolio",
  ) =>
    call("PUT", credentials, {
      baseVersion,
      envelope: await encryptVault(text, credentials),
    });
  const errorOf = async (response: Response) =>
    (await response.json()) as ApiError;

  it("creates a vault, then returns exactly the stored ciphertext", async () => {
    const created = await put(alice, 0);
    const fetched = await call("GET", alice);
    const state = (await fetched.json()) as VaultState;

    expect(created.status).toBe(201);
    expect(await created.clone().json()).toEqual({ version: 1 });
    expect(fetched.status).toBe(200);
    expect(state).toMatchObject({
      version: 1,
      updatedAt: "2026-10-05T12:00:00.000Z",
    });
    expect(state.envelope.format).toBe("trade-count-vault");
  });

  it("stores only a hash of the token and never the plaintext or the token itself", async () => {
    await put(alice, 0, "Tesla 50 shares");
    const record = store.vaults.get(alice.vaultId)!;

    expect(record.tokenHash).toBe(await sha256Hex(alice.authToken));
    expect(JSON.stringify(record)).not.toContain(alice.authToken);
    expect(JSON.stringify(record)).not.toContain("Tesla");
  });

  it("updates with the right base version and bumps the version", async () => {
    await put(alice, 0);
    const response = await put(alice, 1, "second");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: 2 });
  });

  it("rejects an update based on an old version and tells the device which version is current", async () => {
    await put(alice, 0);
    await put(alice, 1);
    const stale = await put(alice, 1, "from a device that missed an update");

    expect(stale.status).toBe(409);
    expect(await errorOf(stale)).toMatchObject({
      error: "VERSION_CONFLICT",
      version: 2,
    });
  });

  it("refuses another key, wrong token and missing credentials without revealing the data", async () => {
    await put(alice, 0, "secret");

    const wrongToken = await call("GET", {
      ...alice,
      authToken: bob.authToken,
    });
    const noHeader = await handleVaultRequest(
      new Request(`https://trade-count.test/api/vaults/${alice.vaultId}`),
      alice.vaultId,
      { store, requestLimiter, writeLimiter, rateLimitSalt: "s" },
    );
    const hijackWrite = await call(
      "PUT",
      { ...alice, authToken: bob.authToken },
      { baseVersion: 1, envelope: await encryptVault("x", bob) },
    );

    expect(wrongToken.status).toBe(401);
    expect(noHeader.status).toBe(401);
    expect(hijackWrite.status).toBe(401);
    expect(await wrongToken.text()).not.toContain("ciphertext");
    expect(store.vaults.get(alice.vaultId)!.version).toBe(1);
  });

  it("answers 404 for a vault that does not exist and refuses to create one from a non-zero version", async () => {
    expect((await call("GET", alice)).status).toBe(404);
    expect((await put(alice, 3)).status).toBe(404);
  });

  it("lets two devices race to create the same vault, with only one winner", async () => {
    const results = await Promise.all([
      put(alice, 0, "phone"),
      put(alice, 0, "laptop"),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it("deletes the vault for its owner only, and deleting twice is fine", async () => {
    await put(alice, 0);

    expect(
      (await call("DELETE", { ...alice, authToken: bob.authToken })).status,
    ).toBe(401);
    expect(store.vaults.has(alice.vaultId)).toBe(true);
    expect((await call("DELETE", alice)).status).toBe(204);
    expect(store.vaults.has(alice.vaultId)).toBe(false);
    expect((await call("DELETE", alice)).status).toBe(204);
  });

  describe("input checks", () => {
    it("rejects bad vault ids, other methods and malformed credentials", async () => {
      const badId = await handleVaultRequest(
        new Request("https://trade-count.test/x"),
        "not-hex",
        {
          store,
          requestLimiter,
          writeLimiter,
          rateLimitSalt: "s",
        },
      );
      const post = await handleVaultRequest(
        new Request(`https://trade-count.test/x`, { method: "POST" }),
        alice.vaultId,
        {
          store,
          requestLimiter,
          writeLimiter,
          rateLimitSalt: "s",
        },
      );
      const shortToken = await call("GET", { ...alice, authToken: "short" });

      expect(badId.status).toBe(400);
      expect(post.status).toBe(405);
      expect(post.headers.get("allow")).toBe("GET, PUT, DELETE");
      expect(shortToken.status).toBe(401);
    });

    it("rejects bodies that are not an encrypted vault", async () => {
      for (const body of [
        { baseVersion: 0, envelope: { hello: "world" } },
        { baseVersion: -1 },
        { baseVersion: "a" },
        "text",
      ]) {
        expect((await call("PUT", alice, body)).status).toBe(400);
      }
      const notJson = await handleVaultRequest(
        new Request(`https://trade-count.test/x`, {
          method: "PUT",
          headers: { authorization: `Bearer ${alice.authToken}` },
          body: "{oops",
        }),
        alice.vaultId,
        { store, requestLimiter, writeLimiter, rateLimitSalt: "s" },
      );
      expect(notJson.status).toBe(400);
      expect(store.vaults.size).toBe(0);
    });

    it("rejects oversized bodies", async () => {
      const envelope = {
        ...(await encryptVault("x", alice)),
        ciphertext: "A".repeat(MAX_ENVELOPE_BYTES + 1),
      };
      const response = await call("PUT", alice, { baseVersion: 0, envelope });

      expect(response.status).toBe(413);
      expect(store.vaults.size).toBe(0);
    });

    it("stops reading a body as soon as it is too big, even without a content-length header", async () => {
      let chunksSent = 0;
      const chunk = new Uint8Array(1_000_000).fill(65);
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (chunksSent >= 60) return controller.close();
          chunksSent++;
          controller.enqueue(chunk);
        },
      });

      const response = await handleVaultRequest(
        new Request(`https://trade-count.test/api/vaults/${alice.vaultId}`, {
          method: "PUT",
          headers: { authorization: `Bearer ${alice.authToken}` },
          body: stream,
          duplex: "half",
        } as RequestInit),
        alice.vaultId,
        { store, requestLimiter, writeLimiter, rateLimitSalt: "s" },
      );

      expect(response.status).toBe(413);
      expect(chunksSent).toBeLessThanOrEqual(2);
    });
  });

  describe("abuse limits", () => {
    const fresh = () => generateSyncKey().then(deriveCredentials);

    /** Creates a vault with `credentials` from a given address and resolves the HTTP status. */
    const create = async (ip: string) => {
      const credentials = await fresh();
      return (
        await call(
          "PUT",
          credentials,
          { baseVersion: 0, envelope: await encryptVault("x", credentials) },
          ip,
        )
      ).status;
    };

    it("limits how many vaults one connection can create per hour", async () => {
      for (let i = 0; i < LIMITS.createsPerClient; i++)
        expect(await create("203.0.113.9")).toBe(201);

      expect(await create("203.0.113.9")).toBe(429);
      expect(await create("198.51.100.9")).toBe(201);
    });

    it("counts all addresses inside one IPv6 /64 as one client, so rotating addresses does not help", async () => {
      const results: number[] = [];
      for (let i = 0; i < LIMITS.createsPerClient + 5; i++)
        results.push(await create(`2001:db8:1:2:${i.toString(16)}::1`));

      expect(results.filter((status) => status === 201)).toHaveLength(
        LIMITS.createsPerClient,
      );
      expect(results.filter((status) => status === 429)).toHaveLength(5);
    });

    it("limits a whole network (an IPv6 /48 or IPv4 /24) even when it spreads over many /64s or addresses", async () => {
      const statuses: number[] = [];
      for (let i = 0; i < LIMITS.createsPerNetwork + 5; i++)
        statuses.push(await create(`2001:db8:7:${i.toString(16)}::1`));
      expect(statuses.filter((s) => s === 201)).toHaveLength(
        LIMITS.createsPerNetwork,
      );

      const v4: number[] = [];
      for (let i = 1; i <= LIMITS.createsPerNetwork + 5; i++)
        v4.push(await create(`192.0.2.${i}`));
      expect(v4.filter((s) => s === 201)).toHaveLength(
        LIMITS.createsPerNetwork,
      );
    });

    it("caps how many vaults anyone can create per hour across all networks", async () => {
      let created = 0;
      for (let i = 0; created < LIMITS.createsInTotal + 3 && i < 400; i++) {
        const status = await create(`10.${i % 200}.${Math.floor(i / 200)}.1`);
        if (status === 201) created++;
        else expect(status).toBe(429);
      }

      expect(created).toBe(LIMITS.createsInTotal);
    });

    it("limits how often one vault can be written, without limiting its reads", async () => {
      await put(alice, 0);
      let version = 1;
      for (let i = 0; i < LIMITS.writesPerVault; i++) {
        expect((await put(alice, version)).status).toBe(200);
        version++;
      }

      const blocked = await put(alice, version);
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("retry-after")).toBe("300");
      expect((await call("GET", alice)).status).toBe(200);
    });

    it("limits total requests per connection, keyed by a salted hash and never the address", async () => {
      for (let i = 0; i < LIMITS.requestsPerClient; i++)
        await call("GET", alice);

      expect((await call("GET", alice)).status).toBe(429);
      expect(
        [...requestLimiter.counts.keys()].every(
          (k) => !k.includes("203.0.113.7"),
        ),
      ).toBe(true);
    });

    it("never writes to the durable limiter for reads or for rejected requests", async () => {
      await call("GET", alice);
      await call("GET", { ...alice, authToken: bob.authToken });
      await handleVaultRequest(
        new Request("https://trade-count.test/x"),
        alice.vaultId,
        { store, requestLimiter, writeLimiter, rateLimitSalt: "s" },
      );
      await call("PUT", alice, {
        baseVersion: 0,
        envelope: { hello: "world" },
      });

      expect(writeLimiter.counts.size).toBe(0);
    });
  });

  describe("storage budget and clean-up", () => {
    const daysLater = (days: number) =>
      new Date(Date.parse("2026-10-05T12:00:00.000Z") + days * 86_400_000).toISOString();

    it("refuses new vaults with 503 once stored envelopes fill the budget, but keeps serving existing ones", async () => {
      await put(alice, 0);
      vaultBudgetBytes = store.vaults.get(alice.vaultId)!.envelope.length;

      const refused = await put(bob, 0);

      expect(refused.status).toBe(503);
      expect((await errorOf(refused)).error).toBe("CAPACITY");
      expect((await call("GET", alice)).status).toBe(200);
      expect((await put(alice, 1)).status).toBe(200);
    });

    it("removes abandoned vaults to make room before refusing a new one", async () => {
      await put(alice, 0);
      vaultBudgetBytes = store.vaults.get(alice.vaultId)!.envelope.length;
      clockIso = daysLater(8);

      expect((await put(bob, 0)).status).toBe(201);
      expect(store.vaults.has(alice.vaultId)).toBe(false);
    });

    it("keeps a vault that was synced again until a year of inactivity, and drops it after", async () => {
      await put(alice, 0);
      clockIso = daysLater(1);
      await put(alice, 1);
      clockIso = daysLater(100);
      await put(bob, 0);
      expect(store.vaults.has(alice.vaultId)).toBe(true);

      clockIso = daysLater(1 + 366);
      const carol = await generateSyncKey().then(deriveCredentials);
      await put(carol, 0);
      expect(store.vaults.has(alice.vaultId)).toBe(false);
    });

    it("records a visit at most once a day, so reads cost almost no writes", async () => {
      await put(alice, 0);
      clockIso = daysLater(0.5);
      await call("GET", alice);
      expect(store.vaults.get(alice.vaultId)!.lastSeenAt).toBe("2026-10-05T12:00:00.000Z");

      clockIso = daysLater(2);
      await call("GET", alice);
      expect(store.vaults.get(alice.vaultId)!.lastSeenAt).toBe(daysLater(2));
    });
  });

  it("marks every response as uncacheable, sniff-proof and without CORS headers", async () => {
    for (const response of [
      await put(alice, 0),
      await call("GET", alice),
      await call("GET", bob),
    ]) {
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    }
  });
});
