"use client";

/**
 * Creator Payout System
 *
 * Manages creator payouts for sold items.
 * Local-first storage, ready for future Stripe Connect integration.
 *
 * Payout lifecycle:
 * - pending: Order not yet paid
 * - eligible: Order paid (paid_mock or paid), payout ready
 * - paid: Payout completed (future: via Stripe Connect)
 *
 * TODO: When implementing Stripe Connect:
 * - Add transferId field to track Stripe Transfer ID
 * - Add payoutDate field
 * - Implement processPayout() function
 */

import type { Order } from "@/lib/cart";
import { getOrderById } from "@/lib/cart";
import { getDesignById } from "@/lib/designs";
import { CREATOR_EARNING_PER_UNIT } from "@/lib/analytics";

export type PayoutStatus = "pending" | "eligible" | "paid";

export type CreatorPayout = {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Links
  orderId: string;
  creatorId: string; // Design owner ID
  designId: string;

  // Amount
  amount: number; // EUR (fixed €7.00 per item)

  // Status
  status: PayoutStatus;

  // Future Stripe Connect fields (not implemented yet)
  // transferId?: string; // Stripe Transfer ID
  // payoutDate?: number; // Timestamp when payout was processed
};

const PAYOUTS_KEY = "loopa_payouts_v1";

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

function uid(prefix = "PO") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function str(v: unknown) {
  return String(v ?? "");
}

function normalizePayoutStatus(v: unknown): PayoutStatus {
  const s = String(v ?? "").toLowerCase();
  if (s === "eligible") return "eligible";
  if (s === "paid") return "paid";
  return "pending";
}

function normalizePayout(anyP: any): CreatorPayout | null {
  if (!anyP) return null;

  const id = str(anyP.id);
  if (!id) return null;

  const createdAt = typeof anyP.createdAt === "string" ? anyP.createdAt : nowISO();
  const updatedAt = typeof anyP.updatedAt === "string" ? anyP.updatedAt : createdAt;

  const orderId = str(anyP.orderId);
  const creatorId = str(anyP.creatorId);
  const designId = str(anyP.designId);

  if (!orderId || !creatorId || !designId) return null;

  const amount = Number(anyP.amount);
  const status = normalizePayoutStatus(anyP.status);

  return {
    id,
    createdAt,
    updatedAt,
    orderId,
    creatorId,
    designId,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    status,
  };
}

function loadPayouts(): CreatorPayout[] {
  if (typeof window === "undefined") return [];

  const parsed = safeParse<CreatorPayout[]>(localStorage.getItem(PAYOUTS_KEY));
  if (!parsed || !Array.isArray(parsed)) return [];

  return parsed.map(normalizePayout).filter((x): x is CreatorPayout => Boolean(x));
}

function savePayouts(payouts: CreatorPayout[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PAYOUTS_KEY, JSON.stringify(payouts));
  } catch {
    // Storage full or other error
  }
}

/**
 * Create payouts for an order's items.
 *
 * Called when an order transitions to paid_mock or paid.
 * Creates one payout per item that has a designId.
 */
export function createPayoutsForOrder(orderId: string): CreatorPayout[] {
  const order = getOrderById(orderId);
  if (!order) return [];

  // Only create payouts for paid orders
  if (order.status !== "paid_mock" && order.status !== "paid") {
    return [];
  }

  const existingPayouts = loadPayouts();
  const existingForOrder = existingPayouts.filter((p) => p.orderId === orderId);

  // If payouts already exist for this order, don't create duplicates
  if (existingForOrder.length > 0) {
    return existingForOrder;
  }

  const newPayouts: CreatorPayout[] = [];
  const createdAt = nowISO();

  for (const item of order.items ?? []) {
    const designId = (item as any).designId as string | undefined;
    if (!designId) continue; // Skip items without designs

    // Get design to find creator (ownerId)
    const design = getDesignById(designId);
    if (!design) continue; // Skip if design not found

    const creatorId = design.ownerId;
    if (!creatorId) continue; // Skip if no creator

    const quantity = Math.max(1, Number((item as any).quantity) || 1);
    const amount = quantity * CREATOR_EARNING_PER_UNIT;

    // Create payout: status is "eligible" because order is paid
    const payout: CreatorPayout = {
      id: uid("PO"),
      createdAt,
      updatedAt: createdAt,
      orderId: order.id,
      creatorId,
      designId,
      amount,
      status: "eligible", // Order is paid, so payout is eligible
    };

    newPayouts.push(payout);
  }

  if (newPayouts.length > 0) {
    savePayouts([...existingPayouts, ...newPayouts]);
  }

  return newPayouts;
}

/**
 * Get all payouts for a specific creator.
 */
export function getPayoutsForCreator(creatorId: string): CreatorPayout[] {
  const all = loadPayouts();
  return all.filter((p) => p.creatorId === creatorId);
}

/**
 * Get all payouts for a specific order.
 */
export function getPayoutsForOrder(orderId: string): CreatorPayout[] {
  const all = loadPayouts();
  return all.filter((p) => p.orderId === orderId);
}

/**
 * Get all payouts with a specific status.
 */
export function getPayoutsByStatus(status: PayoutStatus): CreatorPayout[] {
  const all = loadPayouts();
  return all.filter((p) => p.status === status);
}

/**
 * Update payout status.
 *
 * TODO: When implementing Stripe Connect, this will also:
 * - Create Stripe Transfer
 * - Set transferId
 * - Set payoutDate
 */
export function updatePayoutStatus(payoutId: string, status: PayoutStatus): CreatorPayout | null {
  const all = loadPayouts();
  const idx = all.findIndex((p) => p.id === payoutId);
  if (idx === -1) return null;

  const updated: CreatorPayout = {
    ...all[idx],
    status,
    updatedAt: nowISO(),
  };

  const next = [...all];
  next[idx] = updated;
  savePayouts(next);

  return updated;
}

/**
 * Get total eligible payout amount for a creator.
 */
export function getEligiblePayoutTotal(creatorId: string): number {
  const payouts = getPayoutsForCreator(creatorId);
  return payouts
    .filter((p) => p.status === "eligible")
    .reduce((sum, p) => sum + p.amount, 0);
}
