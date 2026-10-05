import { describe, expect, it } from "vitest";
import {
  SyncAuthError,
  SyncNetworkError,
  SyncRateLimitedError,
  SyncUnavailableError,
  VaultNotFoundError,
} from "./sync-errors.js";
import { createFetchVaultApi } from "./vault-api.js";
import { newCredentials } from "./two-devices.fixture.js";

const reply = (status: number, body?: unknown, type = "application/json") =>
  (async () =>
    new Response(
      body === undefined
        ? null
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
      {
        status,
        headers: type ? { "content-type": type } : {},
      },
    )) as unknown as typeof fetch;
const envelope = {
  format: "trade-count-vault",
  version: 1,
  algorithm: "AES-256-GCM",
  iv: "a",
  ciphertext: "b",
} as const;

describe("createFetchVaultApi", () => {
  it("sends the token as a bearer header to the vault URL and never sends cookies or a referrer", async () => {
    const credentials = await newCredentials();
    let seen: { url: string; init: RequestInit } | undefined;
    const api = createFetchVaultApi(credentials, {
      baseUrl: "https://app.test",
      fetch: (async (url, init) => {
        seen = { url: String(url), init: init! };
        return new Response('{"error":"NOT_FOUND","message":"x"}', {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch,
    });

    expect((await api.get()).vault).toBeNull();
    expect(seen!.url).toBe(
      `https://app.test/api/vaults/${credentials.vaultId}`,
    );
    expect(seen!.init).toMatchObject({
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    expect(seen!.init.headers).toMatchObject({
      authorization: `Bearer ${credentials.authToken}`,
    });
  });

  it("maps server answers to results and errors a person can act on", async () => {
    const credentials = await newCredentials();
    const api = (f: typeof fetch) =>
      createFetchVaultApi(credentials, { fetch: f });

    expect(
      await api(
        reply(409, { error: "VERSION_CONFLICT", message: "x", version: 7 }),
      ).put(3, envelope),
    ).toEqual({ ok: false, conflictVersion: 7 });
    expect(await api(reply(201, { version: 1 })).put(0, envelope)).toEqual({
      ok: true,
      version: 1,
    });
    await expect(
      api(reply(401, { error: "UNAUTHORIZED", message: "x" })).get(),
    ).rejects.toBeInstanceOf(SyncAuthError);
    await expect(
      api(reply(429, { error: "RATE_LIMITED", message: "x" })).get(),
    ).rejects.toBeInstanceOf(SyncRateLimitedError);
    await expect(
      api(reply(404, { error: "NOT_FOUND", message: "x" })).put(2, envelope),
    ).rejects.toBeInstanceOf(VaultNotFoundError);
    await expect(
      api(reply(500, { error: "SERVER_ERROR", message: "x" })).get(),
    ).rejects.toBeInstanceOf(SyncUnavailableError);
  });

  it("treats an HTML answer (an app running without its API) as the service being unavailable", async () => {
    const api = createFetchVaultApi(await newCredentials(), {
      fetch: reply(200, "<!doctype html>", "text/html"),
    });

    await expect(api.get()).rejects.toBeInstanceOf(SyncUnavailableError);
  });

  it("turns a failed request into a network error", async () => {
    const api = createFetchVaultApi(await newCredentials(), {
      fetch: (async () => {
        throw new TypeError("Failed to fetch");
      }) as typeof fetch,
    });

    await expect(api.get()).rejects.toBeInstanceOf(SyncNetworkError);
  });

  describe("clock offset from the server's Date header", () => {
    const answerAt = (dateHeader: string | null) =>
      (async () =>
        new Response('{"error":"NOT_FOUND","message":"x"}', {
          status: 404,
          headers: {
            "content-type": "application/json",
            ...(dateHeader ? { date: dateHeader } : {}),
          },
        })) as unknown as typeof fetch;

    it("is server time minus device time, measured around the middle of the request", async () => {
      const deviceClock = [
        Date.parse("2026-10-05T10:00:00.000Z"),
        Date.parse("2026-10-05T10:00:00.200Z"),
      ];
      const api = createFetchVaultApi(await newCredentials(), {
        fetch: answerAt("Mon, 05 Oct 2026 12:00:00 GMT"),
        now: () => deviceClock.shift()!,
      });

      const { clockOffsetMs } = await api.get();

      // 2 h ahead, plus the half second the header's resolution hides, minus the 0.1 s to mid-request.
      expect(clockOffsetMs).toBe(2 * 3600_000 + 500 - 100);
    });

    it("is unknown when the server sends no usable time", async () => {
      const credentials = await newCredentials();

      expect(
        (
          await createFetchVaultApi(credentials, {
            fetch: answerAt(null),
          }).get()
        ).clockOffsetMs,
      ).toBeNull();
      expect(
        (
          await createFetchVaultApi(credentials, {
            fetch: answerAt("not a date"),
          }).get()
        ).clockOffsetMs,
      ).toBeNull();
    });
  });
});
