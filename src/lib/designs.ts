"use client";

/**
 * src/lib/designs.ts
 * Local-first designs store (localStorage)
 * IMPORTANT: geen JSX hier, enkel data/helpers.
 */

export type ProductType = "tshirt" | "hoodie";
export type PrintArea = "Front" | "Back";

export type ColorOption = { name: string; hex: string };

export type Design = {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  productType: ProductType;
  printArea: PrintArea;
  allowedColors: ColorOption[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserLike = { id?: string; email?: string } | null | undefined;

const STORAGE_KEY = "loopa_designs_v1";

function uid(prefix = "LW-DSN") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function nowISO() {
  return new Date().toISOString();
}

function getUserId(user: UserLike) {
  const id = user?.id?.toString().trim();
  if (id) return id;
  const email = user?.email?.toString().trim();
  if (email) return `email:${email.toLowerCase()}`;
  return null;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadAll(): Design[] {
  if (typeof window === "undefined") return [];
  const arr = safeParse<Design[]>(localStorage.getItem(STORAGE_KEY), []);
  return Array.isArray(arr) ? arr : [];
}

function saveAll(items: Design[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function normalizeColors(input: unknown): ColorOption[] {
  if (!Array.isArray(input)) return [];
  const out: ColorOption[] = [];
  for (const c of input) {
    if (!c || typeof c !== "object") continue;
    const name = (c as any).name;
    const hex = (c as any).hex;
    if (typeof name === "string" && typeof hex === "string") out.push({ name, hex });
  }
  return out;
}

export function listDesignsForUser(user: UserLike): Design[] {
  const userId = getUserId(user);
  if (!userId) return [];
  return loadAll()
    .filter((d) => d.userId === userId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function listPublishedDesigns(): Design[] {
  return loadAll()
    .filter((d) => d.published === true)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function createDraft(
  user: UserLike,
  input: {
    title: string;
    prompt: string;
    productType: ProductType;
    printArea: PrintArea;
    allowedColors?: ColorOption[];
  }
): Design | null {
  const userId = getUserId(user);
  if (!userId) return null;

  const all = loadAll();
  const t = nowISO();

  const design: Design = {
    id: uid(),
    userId,
    title: input.title?.toString() ?? "Untitled design",
    prompt: input.prompt?.toString() ?? "",
    productType: input.productType,
    printArea: input.printArea,
    allowedColors: normalizeColors(input.allowedColors),
    published: false,
    createdAt: t,
    updatedAt: t,
  };

  all.unshift(design);
  saveAll(all);
  return design;
}

export function togglePublish(user: UserLike, designId: string): Design | null {
  const userId = getUserId(user);
  if (!userId) return null;

  const all = loadAll();
  const idx = all.findIndex((d) => d.id === designId && d.userId === userId);
  if (idx === -1) return null;

  const prev = all[idx];
  const next: Design = { ...prev, published: !prev.published, updatedAt: nowISO() };
  all[idx] = next;
  saveAll(all);
  return next;
}

export function deleteDesign(user: UserLike, designId: string): boolean {
  const userId = getUserId(user);
  if (!userId) return false;

  const all = loadAll();
  const before = all.length;
  const next = all.filter((d) => !(d.id === designId && d.userId === userId));
  if (next.length === before) return false;

  saveAll(next);
  return true;
}