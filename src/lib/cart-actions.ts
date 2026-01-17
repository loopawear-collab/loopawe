// src/lib/cart-actions.ts
"use client";

/**
 * Cart Actions (UI-aware)
 * Single place for:
 * - add-to-cart
 * - refresh notification
 * - open mini-cart
 *
 * Use this everywhere instead of calling addToCart() directly.
 */

import { addToCart, emitCartUpdated, type CartItem } from "@/lib/cart";
import { openMiniCart } from "@/lib/cart-ui";

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

  // optional: some pages set this
  productType?: "tshirt" | "hoodie";
};

export function addToCartAndOpenMiniCart(payload: AddToCartPayload): CartItem {
  // 1) Write to cart (local storage)
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

  // 2) Notify UI listeners (mini-cart drawer reloads)
  emitCartUpdated();

  // 3) Open the drawer (works even outside React hooks)
  openMiniCart();

  return created;
}