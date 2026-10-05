import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';

const sqlite3 = await sqlite3InitModule();

export function openMemoryDatabase(): Database {
  return new sqlite3.oo1.DB(':memory:');
}
