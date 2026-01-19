// src/app/account/components/orders/OrderPreview.tsx
"use client";

import type { Order } from "@/lib/cart";

export function getFirstOrderPreview(items: Order["items"]): string | undefined {
  return (items ?? []).find((it) => typeof it.previewDataUrl === "string" && it.previewDataUrl)?.previewDataUrl;
}

export function getOrderUnits(items: Order["items"]): number {
  return (items ?? []).reduce((sum, it) => sum + (Number.isFinite(it.quantity) ? it.quantity : 1), 0);
}