// src/lib/designs.ts
"use client";

/**
 * Local-first designs store (v3 + cleanup)
 * - Safe localStorage storage (compact + prune)
 * - Previews in localStorage
 * - ORIGINAL artwork in IndexedDB via artworkAssetKey
 * - NEW: Cleanup IndexedDB assets on delete + prune
 */

import { idbDeleteImage } from "@/lib/imageStore";

export type ProductType = "tshirt" | "hoodie";
export type PrintArea = "front" | "back";

export type ColorOption = {
  name: string;
  hex: string;
};

export type DesignStatus = "draft" | "published";

export type Design = {
  id: string;
  ownerId: string;

  title: string;
  prompt: string;

  productType: ProductType;
  printArea: PrintArea;

  basePrice: number;

  selectedColor: ColorOption;
  allowedColors: ColorOption[];

  /**
   * IndexedDB key for original artwork.
   * Example: "design:ART-XXXX:artwork"
   */
  artworkAssetKey?: string;

  /**
   * Small previews/snapshots (safe for localStorage)
   */
  previewFrontDataUrl?: string;
  previewBackDataUrl?: string;

  /**
   * Transform (designer)
   */
  imageX?: number;
  imageY?: number;
  imageScale?: number;

  status: DesignStatus;

  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY_V3 = "loopa_designs_v3";
const STORAGE_KEY_V2 = "loopa_designs_v2";
const STORAGE_KEY_V1 = "loopa_designs_v1";

function nowISO() {
  return new Date().toISOString();
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function uid(prefix = "LW") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function normalizeAll(items: any[]): Design[] {
  return (items || [])
    .filter(Boolean)
    .map((d: any) => {
      const createdAt = typeof d.createdAt === "string" ? d.createdAt : nowISO();
      const updatedAt = typeof d.updatedAt === "string" ? d.updatedAt : createdAt;

      const productType: ProductType = d.productType === "hoodie" ? "hoodie" : "tshirt";
      const printArea: PrintArea = d.printArea === "back" ? "back" : "front";

      const allowedColors: ColorOption[] = Array.isArray(d.allowedColors) ? d.allowedColors : [];
      const selectedColor: ColorOption =
        d.selectedColor && d.selectedColor.hex
          ? d.selectedColor
          : allowedColors[0] ?? { name: "White", hex: "#ffffff" };

      const basePrice =
        typeof d.basePrice === "number" && !Number.isNaN(d.basePrice)
          ? d.basePrice
          : productType === "hoodie"
          ? 49.99
          : 34.99;

      const status: DesignStatus = d.status === "published" ? "published" : "draft";

      const out: Design = {
        id: String(d.id ?? ""),
        ownerId: String(d.ownerId ?? "local"),
        title: String(d.title ?? "Untitled design"),
        prompt: String(d.prompt ?? ""),
        productType,
        printArea,
        basePrice,
        selectedColor,
        allowedColors,

        artworkAssetKey: typeof d.artworkAssetKey === "string" ? d.artworkAssetKey : undefined,

        previewFrontDataUrl: typeof d.previewFrontDataUrl === "string" ? d.previewFrontDataUrl : undefined,
        previewBackDataUrl: typeof d.previewBackDataUrl === "string" ? d.previewBackDataUrl : undefined,

        imageX: typeof d.imageX === "number" ? d.imageX : 0,
        imageY: typeof d.imageY === "number" ? d.imageY : 0,
        imageScale: typeof d.imageScale === "number" ? d.imageScale : 1,

        status,
        createdAt,
        updatedAt,
      };

      return out;
    })
    .filter((d) => d.id.length > 0);
}

/**
 * Compact policy: we never store huge strings in localStorage.
 */
function compactDesignForStorage(d: Design): Design {
  const MAX_DATAURL_CHARS = 140_000; // ~280KB rough
  const shallow: Design = { ...d };

  if (shallow.previewFrontDataUrl && shallow.previewFrontDataUrl.length > MAX_DATAURL_CHARS) {
    shallow.previewFrontDataUrl = undefined;
  }
  if (shallow.previewBackDataUrl && shallow.previewBackDataUrl.length > MAX_DATAURL_CHARS) {
    shallow.previewBackDataUrl = undefined;
  }

  return shallow;
}

function trySaveAll(items: Design[]): boolean {
  if (typeof window === "undefined") return false;
  const compacted = items.map(compactDesignForStorage);
  const json = JSON.stringify(compacted);
  try {
    localStorage.setItem(STORAGE_KEY_V3, json);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cleanup helper:
 * - artworkAssetKey is a direct IndexedDB key. We delete it.
 * - also tries to delete a matching thumb key (if you ever store it)
 */
function cleanupAssets(d: Design) {
  if (typeof window === "undefined") return;

  const key = d.artworkAssetKey;
  if (key) {
    // fire-and-forget async cleanup
    void idbDeleteImage(key).catch(() => {});
    // optional: if someone stored "thumb" too, remove it
    const thumbKey = key.replace(/:artwork$/, ":thumb");
    if (thumbKey !== key) void idbDeleteImage(thumbKey).catch(() => {});
  }
}

/**
 * Save strategy:
 * 1) try direct
 * 2) prune oldest drafts until it fits (AND cleanup their assets)
 * 3) keep only published (cleanup all removed draft assets)
 * 4) clear as last resort
 */
function saveAll(items: Design[]) {
  if (trySaveAll(items)) return;

  let working = [...items];

  const draftsOldestFirst = working
    .filter((d) => d.status === "draft")
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  // 2) prune oldest drafts one by one
  for (const draft of draftsOldestFirst) {
    cleanupAssets(draft);
    working = working.filter((x) => x.id !== draft.id);
    if (trySaveAll(working)) return;
  }

  // 3) keep only published (cleanup all draft assets)
  const publishedOnly = items.filter((d) => d.status === "published");
  const removedDrafts = items.filter((d) => d.status === "draft");
  removedDrafts.forEach(cleanupAssets);
  if (trySaveAll(publishedOnly)) return;

  // 4) last resort: clear store (cleanup everything we’re about to drop)
  items.forEach(cleanupAssets);
  try {
    localStorage.removeItem(STORAGE_KEY_V3);
  } catch {}
}

function loadAll(): Design[] {
  if (typeof window === "undefined") return [];

  const v3 = safeParse<Design[]>(localStorage.getItem(STORAGE_KEY_V3));
  if (v3 && Array.isArray(v3)) return normalizeAll(v3 as any);

  const v2 = safeParse<any[]>(localStorage.getItem(STORAGE_KEY_V2));
  if (v2 && Array.isArray(v2)) {
    const migrated = normalizeAll(v2);
    saveAll(migrated);
    return migrated;
  }

  const v1 = safeParse<any[]>(localStorage.getItem(STORAGE_KEY_V1));
  if (v1 && Array.isArray(v1)) {
    const migrated = normalizeAll(v1);
    saveAll(migrated);
    return migrated;
  }

  return [];
}

export function getDesignById(id: string): Design | null {
  const all = loadAll();
  return all.find((d) => d.id === id) ?? null;
}

export function listDesignsForUser(ownerId: string): Design[] {
  const all = loadAll();
  return all
    .filter((d) => d.ownerId === ownerId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function listPublishedDesigns(): Design[] {
  const all = loadAll();
  return all
    .filter((d) => d.status === "published")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function createDraft(input: Omit<Design, "id" | "status" | "createdAt" | "updatedAt">): Design {
  const all = loadAll();
  const createdAt = nowISO();

  const d: Design = {
    ...input,
    id: uid("LW"),
    status: "draft",
    createdAt,
    updatedAt: createdAt,
  };

  const next = [d, ...all];
  saveAll(next);
  return d;
}

export function updateDesign(id: string, patch: Partial<Design>): Design | null {
  const all = loadAll();
  const idx = all.findIndex((d) => d.id === id);
  if (idx === -1) return null;

  const updated: Design = {
    ...all[idx],
    ...patch,
    updatedAt: nowISO(),
  };

  const next = [...all];
  next[idx] = updated;
  saveAll(next);
  return updated;
}

export function deleteDesign(id: string): boolean {
  const all = loadAll();
  const found = all.find((d) => d.id === id);
  if (found) cleanupAssets(found);

  const next = all.filter((d) => d.id !== id);
  saveAll(next);
  return next.length !== all.length;
}

export function togglePublish(id: string, publish: boolean): Design | null {
  return updateDesign(id, { status: publish ? "published" : "draft" });
}

export function getDesignsStorageStats() {
  const all = loadAll();
  const json = JSON.stringify(all.map(compactDesignForStorage));
  return {
    designs: all.length,
    approxBytes: json.length * 2,
  };
}