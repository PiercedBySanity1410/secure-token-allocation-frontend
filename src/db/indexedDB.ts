import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CachedToken } from '../types';

interface TokenDB extends DBSchema {
  tokens: {
    key: string; // requestId
    value: CachedToken;
    indexes: { 'by-date': string; 'by-allocation': string };
  };
}

const DB_NAME = 'token_allocation_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TokenDB>> | null = null;

function getDB(): Promise<IDBPDatabase<TokenDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TokenDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tokens')) {
          const store = db.createObjectStore('tokens', { keyPath: 'requestId' });
          store.createIndex('by-date', 'date');
          store.createIndex('by-allocation', 'allocationId');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveTokenToIndexedDB(token: CachedToken): Promise<void> {
  const db = await getDB();
  await db.put('tokens', {
    ...token,
    syncTimestamp: Date.now(),
  });
}

export async function getTokenFromIndexedDB(requestId: string): Promise<CachedToken | undefined> {
  const db = await getDB();
  return await db.get('tokens', requestId);
}

export async function getAllTokensFromIndexedDB(): Promise<CachedToken[]> {
  const db = await getDB();
  return await db.getAll('tokens');
}

export async function getLatestTokenFromIndexedDB(): Promise<CachedToken | undefined> {
  const all = await getAllTokensFromIndexedDB();
  if (all.length === 0) return undefined;
  // Sort descending by syncTimestamp
  all.sort((a, b) => b.syncTimestamp - a.syncTimestamp);
  return all[0];
}

export async function removeTokenFromIndexedDB(requestId: string): Promise<void> {
  const db = await getDB();
  await db.delete('tokens', requestId);
}
