// src/lib/cart-actions.ts
"use client";

import { addToCart } from "@/lib/cart";
import type { CartItem } from "@/lib/cart";

/**
 * One single function to:
 * 1) add item to cart
 * 2) emit cart updated event
 * 3) open mini cart drawer
 *
 * This avoids copy/paste bugs across pages.
 */
export function addToCartAndOpenUI(
  item: CartItem,
  ui: { emitCartUpdated: () => void; openMiniCart: () => void }
) {
  addToCart(item as any);
  ui.emitCartUpdated();
  ui.openMiniCart();
}