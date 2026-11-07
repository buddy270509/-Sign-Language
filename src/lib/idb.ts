/**
 * Tiny IndexedDB key/value store used by the Sign Studio autosave.
 *
 * Deliberately small: one database, one object store, no schema migrations. If IndexedDB
 * is unavailable (private mode, older browser) it falls back to localStorage so the Studio
 * never loses work silently.
 */
const DB_NAME = 'signbridge';
const STORE = 'kv';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return fallbackGet<T>(key);
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => resolve(fallbackGet<T>(key));
    } catch {
      resolve(fallbackGet<T>(key));
    }
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  if (!db) {
    fallbackSet(key, value);
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        fallbackSet(key, value);
        resolve();
      };
    } catch {
      fallbackSet(key, value);
      resolve();
    }
  });
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  if (!db) {
    try {
      localStorage.removeItem(`sb.${key}`);
    } catch {
      /* ignore */
    }
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function fallbackGet<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(`sb.${key}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function fallbackSet(key: string, value: unknown) {
  try {
    localStorage.setItem(`sb.${key}`, JSON.stringify(value));
  } catch {
    /* nothing else to do */
  }
}
