/** Failures a person can act on; each carries a message written for them. */

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The device is offline or the server could not be reached. */
export class SyncNetworkError extends SyncError {
  constructor() {
    super("Couldn't reach the sync server. Check your connection; syncing resumes when you're back online.");
  }
}

/** The server answered, but not like the sync API (for example the app runs without its server). */
export class SyncUnavailableError extends SyncError {
  constructor() {
    super('The sync service is not available right now. Try again in a moment.');
  }
}

export class SyncRateLimitedError extends SyncError {
  constructor() {
    super('Too many sync requests from this connection. Wait a few minutes and try again.');
  }
}

/** The sync key doesn't match the vault on the server. */
export class SyncAuthError extends SyncError {
  constructor() {
    super("The server doesn't accept this sync key.");
  }
}

/** No synced data exists for this key (a mistyped key, or sync was turned off elsewhere). */
export class VaultNotFoundError extends SyncError {
  constructor() {
    super('No synced data was found for this sync key. Check the key, or turn on sync on the device that has your data.');
  }
}

/** Several devices kept writing at once; nothing was lost, trying again later will work. */
export class SyncBusyError extends SyncError {
  constructor() {
    super('Other devices are syncing at the same time. Try again in a moment.');
  }
}

/** This device synced before, and the vault is gone: sync was turned off on another device. */
export class VaultGoneError extends SyncError {
  constructor() {
    super(
      'Sync was turned off on another device, so this device stopped syncing. Your data here is unchanged. ' +
        'Turn on sync again to create a new synced copy.',
    );
  }
}
