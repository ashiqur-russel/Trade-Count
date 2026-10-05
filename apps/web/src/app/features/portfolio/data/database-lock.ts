const LOCK_NAME = 'trade-count-database';

/** A lock request that never settles keeps the lock until the worker that made it ends. */
const HELD_UNTIL_WORKER_ENDS = new Promise<void>(() => undefined);

/*
 * The on-device database allows one opener at a time. The first tab gets the lock at once; later tabs
 * (and a reloaded page whose old worker hasn't ended yet) report that they are waiting, then continue on
 * their own when the lock is released. Browsers without Web Locks skip this and keep the old behaviour.
 */
export function acquireDatabaseLock(
  onWaiting: () => void,
  locks: Pick<LockManager, 'request'> | undefined = globalThis.navigator?.locks,
): Promise<void> {
  if (!locks) return Promise.resolve();
  return new Promise((acquired) => {
    void locks.request(LOCK_NAME, { ifAvailable: true }, (lock) => {
      if (lock) {
        acquired();
        return HELD_UNTIL_WORKER_ENDS;
      }
      onWaiting();
      return locks.request(LOCK_NAME, () => {
        acquired();
        return HELD_UNTIL_WORKER_ENDS;
      });
    });
  });
}
