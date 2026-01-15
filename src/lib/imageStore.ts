// src/lib/imageStore.ts
"use client";

/**
 * IndexedDB Image Store for LOOPAWE
 * - Stores large data (image dataUrls) outside localStorage quota
 * - Keyed by string IDs (assetKey)
 */

const DB_NAME = "loopawe_db";
const DB_VERSION = 1;
const STORE_NAME = "assets";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available in this browser."));
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

export async function idbSetString(key: string, value: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    tx.objectStore(STORE_NAME).put(value, key);
  });
  db.close();
}

export async function idbGetString(key: string): Promise<string | null> {
  const db = await openDB();
  const value = await new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB read failed"));
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB get failed"));
  });
  db.close();
  return value;
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
    tx.objectStore(STORE_NAME).delete(key);
  });
  db.close();
}

export function makeAssetKey(designId: string, kind: "artwork" | "thumb") {
  return `design:${designId}:${kind}`;
}