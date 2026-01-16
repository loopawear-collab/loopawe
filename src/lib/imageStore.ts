// src/lib/imageStore.ts
"use client";

/**
 * IndexedDB Image Store for LOOPAWE (v2)
 * - Stores large image data outside localStorage quota
 * - Keys are deterministic: design:<id>:<kind>
 * - Safe cleanup helpers included
 */

const DB_NAME = "loopawe_db";
const DB_VERSION = 1;
const STORE_NAME = "assets";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
  });
}

/* ========================
   CORE LOW-LEVEL OPS
======================== */

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);

    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);

    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

/* ========================
   PUBLIC API
======================== */

export function makeAssetKey(designId: string, kind: "artwork" | "thumb") {
  return `design:${designId}:${kind}`;
}

export async function idbSaveImage(key: string, dataUrl: string): Promise<void> {
  await withStore<void>("readwrite", (store) => store.put(dataUrl, key));
}

export async function idbGetImage(key: string): Promise<string | null> {
  return await withStore<string | null>("readonly", (store) => store.get(key));
}

export async function idbDeleteImage(key: string): Promise<void> {
  await withStore<void>("readwrite", (store) => store.delete(key));
}

/* ========================
   HIGH-LEVEL CLEANUP
======================== */

/**
 * Remove all images linked to a design
 * (called when deleting / pruning drafts)
 */
export async function deleteDesignImages(designId: string) {
  const keys = [
    makeAssetKey(designId, "artwork"),
    makeAssetKey(designId, "thumb"),
  ];

  for (const key of keys) {
    try {
      await idbDeleteImage(key);
    } catch {
      // silent fail: image may not exist
    }
  }
}

/**
 * Debug / dev helper
 */
export async function listAllImageKeys(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const keys: string[] = [];

    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        keys.push(String(cursor.key));
        cursor.continue();
      } else {
        resolve(keys);
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}