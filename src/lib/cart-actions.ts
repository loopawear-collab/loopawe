// src/lib/cart-actions.ts
"use client";

/**
 * Cart Actions (UI-aware)
 * Single place for:
 * - add-to-cart
 * - open mini-cart (via global UI event)
 *
 * IMPORTANT:
 * - Contains a small dedupe-guard so 1 click never adds twice (event bubbling / double triggers)
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

/**
 * Dedupe guard:
 * If the exact same payload is triggered twice within a tiny window,
 * we ignore the second call.
 */
let lastSig = "";
let lastAt = 0;

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
    // Still open the cart (UX feels consistent), but don't add again
    requestOpenMiniCart();
    // return a "best guess" item: the cart already contains the merged item anyway
    // (we return a new addToCart result normally, but here we avoid a second write)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { id: "deduped", name: payload.name, price: payload.price, quantity: payload.quantity ?? 1, color: payload.color, size: payload.size, printArea: payload.printArea } as any;
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

  requestOpenMiniCart();
  return created;
}