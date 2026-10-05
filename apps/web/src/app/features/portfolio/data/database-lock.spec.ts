import { acquireDatabaseLock } from './database-lock';

/** Enough of the Web Locks API to model one exclusive lock that is released by hand. */
class FakeLockManager {
  private held = false;
  private readonly queue: (() => void)[] = [];

  release(): void {
    this.held = false;
    this.queue.shift()?.();
  }

  request(_name: string, optionsOrCallback: unknown, maybeCallback?: unknown): Promise<unknown> {
    const ifAvailable = typeof optionsOrCallback === 'object';
    const callback = (maybeCallback ?? optionsOrCallback) as (lock: object | null) => Promise<unknown>;
    if (!this.held) {
      this.held = true;
      return callback({});
    }
    if (ifAvailable) return callback(null);
    return new Promise((resolve) => this.queue.push(() => ((this.held = true), resolve(callback({})))));
  }
}

describe('acquireDatabaseLock', () => {
  it('resolves at once and reports nothing when no other tab holds the database', async () => {
    const onWaiting = vi.fn();

    await acquireDatabaseLock(onWaiting, new FakeLockManager() as unknown as LockManager);

    expect(onWaiting).not.toHaveBeenCalled();
  });

  it('reports waiting while another tab holds the database, then continues once it is released', async () => {
    const locks = new FakeLockManager() as unknown as LockManager;
    await acquireDatabaseLock(vi.fn(), locks);
    const onWaiting = vi.fn();
    let acquired = false;

    const second = acquireDatabaseLock(onWaiting, locks).then(() => (acquired = true));
    await Promise.resolve();
    expect(onWaiting).toHaveBeenCalledOnce();
    expect(acquired).toBe(false);

    (locks as unknown as FakeLockManager).release();
    await second;
    expect(acquired).toBe(true);
  });

  it('carries on without a lock where the browser has no Web Locks', async () => {
    await expect(acquireDatabaseLock(vi.fn(), undefined)).resolves.toBeUndefined();
  });
});
