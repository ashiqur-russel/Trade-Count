import {
  WindowedMemoryRateLimiter,
  createD1RateLimiter,
  createD1VaultStore,
  handleVaultRequest,
  type D1Like,
} from '@trade-count/sync-server';

interface Env {
  DB?: D1Like;
  /** Secret that salts rate-limit keys; set with `wrangler pages secret put RATE_LIMIT_SALT`. */
  RATE_LIMIT_SALT?: string;
  /** Optional override of the storage budget in bytes for new vaults. */
  VAULT_BUDGET_BYTES?: string;
}

interface Context {
  request: Request;
  params: { vaultId?: string | string[] };
  env: Env;
}

/** Counts requests in this instance's memory, so reads and rejected requests cost no database writes. */
const requestLimiter = new WindowedMemoryRateLimiter();

/** Cloudflare Pages Function for /api/vaults/:vaultId; all logic lives in @trade-count/sync-server. */
export const onRequest = async ({ request, params, env }: Context): Promise<Response> => {
  if (!env.DB || !env.RATE_LIMIT_SALT) {
    console.error('Vault API is not configured: missing DB binding or RATE_LIMIT_SALT');
    return new Response(JSON.stringify({ error: 'SERVER_ERROR', message: 'The sync service is not available.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  const vaultId = Array.isArray(params.vaultId) ? params.vaultId[0] : params.vaultId;
  return handleVaultRequest(request, vaultId ?? '', {
    store: createD1VaultStore(env.DB),
    requestLimiter,
    writeLimiter: createD1RateLimiter(env.DB),
    rateLimitSalt: env.RATE_LIMIT_SALT,
    vaultBudgetBytes: env.VAULT_BUDGET_BYTES ? Number(env.VAULT_BUDGET_BYTES) : undefined,
  });
};
