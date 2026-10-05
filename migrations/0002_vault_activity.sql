-- When a device last opened a vault, so abandoned copies can be removed and storage stays bounded.
ALTER TABLE vaults ADD COLUMN last_seen_at TEXT NOT NULL DEFAULT '';
UPDATE vaults SET last_seen_at = updated_at;
CREATE INDEX vaults_last_seen_at ON vaults (last_seen_at);
