/// <reference lib="webworker" />
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import sqliteWasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm';
import { PortfolioDatabase, StoreError } from '@trade-count/local-store';
import { formatIsoDate } from '../../../shared/dates/iso-date';
import { acquireDatabaseLock } from './database-lock';
import type { DbFailure, DbNotice, DbRequest, DbResponse } from './portfolio-db-protocol';

const DATABASE_FILE = '/portfolio.sqlite3';

// The typings omit Emscripten's module options, which the runtime accepts; locateFile points it at the bundled .wasm.
const initSqlite = sqlite3InitModule as (options: {
  locateFile: (file: string) => string;
}) => ReturnType<typeof sqlite3InitModule>;

const database = openWhenNoOtherTabHasIt();

async function openWhenNoOtherTabHasIt(): Promise<PortfolioDatabase> {
  await acquireDatabaseLock(() =>
    postMessage({ notice: 'waiting-for-other-tab' } satisfies DbNotice),
  );
  const opened = await openDatabase();
  postMessage({ notice: 'database-ready' } satisfies DbNotice);
  return opened;
}

/** The SAH-pool VFS stores the file in this origin's private file system and needs no special headers. */
async function openDatabase(): Promise<PortfolioDatabase> {
  const sqlite3 = await initSqlite({ locateFile: () => sqliteWasmUrl });
  const pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'trade-count' });
  return new PortfolioDatabase(new pool.OpfsSAHPoolDb(DATABASE_FILE), {
    formatDate: formatIsoDate,
  });
}

function toFailure(error: unknown): DbFailure {
  if (error instanceof StoreError) return error.toFailure();
  console.error('Trade Count storage error', error);
  return {
    code: 'UNAVAILABLE',
    message:
      "Couldn't open your data on this device. If Trade Count is open in another tab, close it and reload. " +
      'Private browsing windows may not allow storage.',
  };
}

addEventListener('message', async ({ data: request }: MessageEvent<DbRequest>) => {
  let response: DbResponse;
  try {
    const db = await database;
    const method = db[request.method] as (...args: unknown[]) => unknown;
    response = { id: request.id, ok: true, result: method.apply(db, request.args) };
  } catch (error) {
    response = { id: request.id, ok: false, failure: toFailure(error) };
  }
  postMessage(response);
});
