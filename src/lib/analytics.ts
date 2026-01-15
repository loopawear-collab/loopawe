"use client";

import type { Order } from "@/lib/cart";

export type DesignSalesStats = {
  designId: string;
  unitsSold: number;
  revenue: number; // gross
  creatorEarnings: number; // net to creator
  loopaCut: number; // platform cut
  lastSaleAt: string | null;
};

export type OverallStats = {
  totalOrders: number;
  totalUnits: number;
  totalRevenue: number;
  totalCreatorEarnings: number;
  totalLoopaCut: number;
};

export const DEFAULT_CREATOR_SHARE = 0.7; // 70% creator / 30% platform

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function maxDate(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export function computeDesignStats(
  orders: Order[],
  creatorShare: number = DEFAULT_CREATOR_SHARE
): Map<string, DesignSalesStats> {
  const share = Math.min(0.95, Math.max(0.05, creatorShare)); // safety clamp

  const map = new Map<string, DesignSalesStats>();

  for (const order of orders) {
    const orderDate = typeof order.createdAt === "string" ? order.createdAt : null;

    for (const item of order.items ?? []) {
      const designId = (item as any).designId as string | undefined;
      if (!designId) continue;

      const qty = Math.max(1, toNumber((item as any).quantity));
      const unitPrice = toNumber((item as any).price);
      const lineRevenue = unitPrice * qty;

      const existing =
        map.get(designId) ??
        ({
          designId,
          unitsSold: 0,
          revenue: 0,
          creatorEarnings: 0,
          loopaCut: 0,
          lastSaleAt: null,
        } satisfies DesignSalesStats);

      const revenue = existing.revenue + lineRevenue;
      const creatorEarnings = revenue * share;
      const loopaCut = revenue - creatorEarnings;

      map.set(designId, {
        ...existing,
        unitsSold: existing.unitsSold + qty,
        revenue,
        creatorEarnings,
        loopaCut,
        lastSaleAt: maxDate(existing.lastSaleAt, orderDate),
      });
    }
  }

  return map;
}

export function computeOverallStats(
  orders: Order[],
  creatorShare: number = DEFAULT_CREATOR_SHARE
): OverallStats {
  const perDesign = computeDesignStats(orders, creatorShare);

  let totalUnits = 0;
  let totalRevenue = 0;
  let totalCreatorEarnings = 0;
  let totalLoopaCut = 0;

  for (const s of perDesign.values()) {
    totalUnits += s.unitsSold;
    totalRevenue += s.revenue;
    totalCreatorEarnings += s.creatorEarnings;
    totalLoopaCut += s.loopaCut;
  }

  return {
    totalOrders: orders.length,
    totalUnits,
    totalRevenue,
    totalCreatorEarnings,
    totalLoopaCut,
  };
}