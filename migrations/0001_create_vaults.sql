-- Encrypted vaults. The server never sees plaintext: `envelope` is AES-GCM ciphertext,
-- and only a SHA-256 of the auth token is kept, so the token itself cannot be recovered from this table.
CREATE TABLE vaults (
  vault_id TEXT PRIMARY KEY NOT NULL CHECK (length(vault_id) = 32),
  token_hash TEXT NOT NULL CHECK (length(token_hash) = 64),
  version INTEGER NOT NULL CHECK (version >= 1),
  envelope TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Per-client request counters keyed by a salted hash (never an IP address); old windows are purged as new ones open.
CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
) WITHOUT ROWID;

CREATE INDEX rate_limits_window_start ON rate_limits (window_start);
