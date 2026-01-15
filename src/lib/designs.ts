// src/lib/designs.ts
"use client";

/**
 * LOOPAWE designs store (v3)
 * - Metadata + thumbnails in localStorage
 * - Large artwork lives in IndexedDB (see imageStore.ts)
 */

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
   * IMPORTANT:
   * - artworkAssetKey points to IndexedDB (large image)
   * - preview* are small thumbnails stored in localStorage for marketplace
   */
  artworkAssetKey?: string;
  previewFrontDataUrl?: string;
  previewBackDataUrl?: string;

  // image transform for placement (optional)
  imageX?: number;
  imageY?: number;
  imageScale?: number;

  status: DesignStatus;

  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "loopa_designs_v3";

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
        typeof d.basePrice === "number" && Number.isFinite(d.basePrice)
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

        previewFrontDataUrl:
          typeof d.previewFrontDataUrl === "string" ? d.previewFrontDataUrl : undefined,
        previewBackDataUrl:
          typeof d.previewBackDataUrl === "string" ? d.previewBackDataUrl : undefined,

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
 * Keep previews small to prevent localStorage blow-up.
 * If preview gets too big, drop it (marketplace will show "No preview" instead of crashing).
 */
function compactForStorage(d: Design): Design {
  const MAX_THUMB_CHARS = 120_000; // safe-ish
  const out: Design = { ...d };

  if (out.previewFrontDataUrl && out.previewFrontDataUrl.length > MAX_THUMB_CHARS) {
    out.previewFrontDataUrl = undefined;
  }
  if (out.previewBackDataUrl && out.previewBackDataUrl.length > MAX_THUMB_CHARS) {
    out.previewBackDataUrl = undefined;
  }

  // artworkAssetKey is tiny -> safe to keep.
  return out;
}

function loadAll(): Design[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<any[]>(localStorage.getItem(STORAGE_KEY));
  if (!parsed || !Array.isArray(parsed)) return [];
  return normalizeAll(parsed);
}

/**
 * Save strategy:
 * - try save
 * - if quota: prune oldest drafts first
 * - if still quota: keep only published
 */
function saveAll(items: Design[]) {
  if (typeof window === "undefined") return;

  const compacted = items.map(compactForStorage);
  const json = JSON.stringify(compacted);

  try {
    localStorage.setItem(STORAGE_KEY, json);
    return;
  } catch {
    // quota: prune drafts
  }

  let working = [...compacted];
  const draftsOldestFirst = working
    .filter((d) => d.status === "draft")
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  for (const d of draftsOldestFirst) {
    working = working.filter((x) => x.id !== d.id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(working));
      return;
    } catch {
      // keep pruning
    }
  }

  // keep only published
  const publishedOnly = compacted.filter((d) => d.status === "published");
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(publishedOnly));
  } catch {
    // last resort clear
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
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

export function createDraft(
  input: Omit<Design, "id" | "status" | "createdAt" | "updatedAt">
): Design {
  const all = loadAll();
  const createdAt = nowISO();

  const d: Design = {
    ...input,
    id: uid("LW"),
    status: "draft",
    createdAt,
    updatedAt: createdAt,
  };

  saveAll([d, ...all]);
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

export function togglePublish(id: string, publish: boolean): Design | null {
  return updateDesign(id, { status: publish ? "published" : "draft" });
}

export function deleteDesign(id: string): boolean {
  const all = loadAll();
  const next = all.filter((d) => d.id !== id);
  saveAll(next);
  return next.length !== all.length;
}

export function clearDrafts(): void {
  const all = loadAll();
  saveAll(all.filter((d) => d.status === "published"));
}