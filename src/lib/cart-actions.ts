// src/lib/cart-actions.ts
"use client";

/**
 * Cart Actions (UI-aware)
 * Single place for:
 * - add-to-cart (with safe dedupe guard)
 * - reorder (add all items + open mini-cart once)
 *
 * Why this file exists:
 * - So every page uses the same stable entrypoint (no more mixed direct addToCart + UI hacks)
 * - Keeps UI behavior consistent (mini-cart always opens)
 */

import { addToCart, type CartItem } from "@/lib/cart";

export type AddToCartPayload = {
  name: string; // "T-shirt" | "Hoodie"
  price: number;
  quantity?: number;

  color: string;
  colorHex?: string;
  size: string;
  printArea: string; // "Front" | "Back"

  designId?: string;
  previewDataUrl?: string;

  productType?: "tshirt" | "hoodie";
};

const UI_OPEN_EVENT = "loopa:cartui:open";

function requestOpenMiniCart() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(UI_OPEN_EVENT));
}

/** -------------------------
 * Dedupe guard (prevents accidental double add)
 * ------------------------*/
let lastSig = "";
let lastAt = 0;
let lastCreated: CartItem | null = null;

function signature(p: AddToCartPayload) {
  return [
    p.designId ?? "",
    p.productType ?? "",
    p.name ?? "",
    p.size ?? "",
    p.color ?? "",
    p.printArea ?? "",
    String(p.price ?? ""),
    String(p.quantity ?? 1),
  ].join("|");
}

export function addToCartAndOpenMiniCart(payload: AddToCartPayload): CartItem {
  const sig = signature(payload);
  const now = Date.now();

  // 300ms is genoeg om accidental double triggers te blokkeren
  if (sig === lastSig && now - lastAt < 300) {
    requestOpenMiniCart();
    // Return the last real created item if we have it (no fake "deduped" items)
    if (lastCreated) return lastCreated;
    // Fallback: do a single add (rare edge-case: first call crashed before setting lastCreated)
  }

  lastSig = sig;
  lastAt = now;

  const created = addToCart({
    name: payload.name,
    productType: payload.productType,
    price: payload.price,
    quantity: payload.quantity ?? 1,
    color: payload.color,
    colorHex: payload.colorHex,
    size: payload.size,
    printArea: payload.printArea,
    designId: payload.designId,
    previewDataUrl: payload.previewDataUrl,
  });

  lastCreated = created;

  requestOpenMiniCart();
  return created;
}

/** -------------------------
 * Reorder helpers (add all items + open once)
 * ------------------------*/
export type ReorderSourceItem = Pick<
  CartItem,
  "name" | "price" | "quantity" | "color" | "size" | "printArea"
> &
  Partial<Pick<CartItem, "productType" | "colorHex" | "designId" | "previewDataUrl">>;

export type ReorderSource = {
  items: ReorderSourceItem[];
};

// Lightweight guard so a double-click on "Bestel opnieuw" doesn't add twice
let reorderAt = 0;
let reorderSig = "";

function reorderSignature(items: ReorderSourceItem[]) {
  return items
    .map((it) =>
      [
        it.designId ?? "",
        it.productType ?? "",
        it.name ?? "",
        it.size ?? "",
        it.color ?? "",
        it.printArea ?? "",
        String(it.price ?? ""),
        String(it.quantity ?? 1),
      ].join("|")
    )
    .join("~~");
}

export function reorderToCartAndOpenMiniCart(source: ReorderSource): { addedCount: number } {
  const items = Array.isArray(source?.items) ? source.items : [];
  if (items.length === 0) {
    requestOpenMiniCart();
    return { addedCount: 0 };
  }

  const sig = reorderSignature(items);
  const now = Date.now();

  // Block accidental double click spam (slightly longer window than add-to-cart)
  if (sig === reorderSig && now - reorderAt < 600) {
    requestOpenMiniCart();
    return { addedCount: 0 };
  }

  reorderSig = sig;
  reorderAt = now;

  // Add everything; cart.ts will merge identical variants automatically.
  for (const it of items) {
    const qty = Number.isFinite(it.quantity) ? Math.max(1, Math.floor(it.quantity)) : 1;

    addToCart({
      name: it.name,
      productType: it.productType,
      price: Number.isFinite(it.price) ? it.price : 0,
      quantity: qty,
      color: it.color ?? "White",
      colorHex: it.colorHex,
      size: it.size ?? "M",
      printArea: it.printArea ?? "Front",
      designId: it.designId,
      previewDataUrl: it.previewDataUrl,
    });
  }

  requestOpenMiniCart();
  return { addedCount: items.length };
}