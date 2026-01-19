// src/app/account/components/orders/OrderCard.tsx
"use client";

import Link from "next/link";
import type { Order } from "@/lib/cart";

export type OrderCardTotals = {
  subtotal: number;
  shipping: number;
  total: number;
};

export type OrderCardProps = {
  order: Order;
  previewDataUrl?: string;
  unitTotal: number;
  totals: OrderCardTotals;
  isBusy?: boolean;
  onReorder: (order: Order) => void;
};

function dt(v?: string | number | Date) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("nl-BE");
}

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

export function OrderCard({ order, previewDataUrl, unitTotal, totals, isBusy, onReorder }: OrderCardProps) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
            {previewDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] text-zinc-500">No preview</span>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-900">Order {order.id}</p>
            <p className="mt-1 text-xs text-zinc-600">
              {dt(order.createdAt)} • {unitTotal} {unitTotal === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-zinc-500">Totaal</p>
          <p className="text-lg font-semibold text-zinc-900">{eur(totals.total)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/account/orders/${encodeURIComponent(order.id)}`}
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          Bekijk details →
        </Link>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onReorder(order)}
            disabled={!!isBusy}
            className={`rounded-full px-4 py-2 text-sm font-medium text-white ${
              isBusy ? "cursor-not-allowed bg-zinc-300" : "bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            {isBusy ? "Bezig…" : "Bestel opnieuw"}
          </button>

          <Link
            href="/marketplace"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Opnieuw shoppen
          </Link>
        </div>
      </div>
    </div>
  );
}