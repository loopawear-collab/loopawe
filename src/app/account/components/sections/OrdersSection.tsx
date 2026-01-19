"use client";

import Link from "next/link";
import type { Order } from "@/lib/cart";
import { computeOrderTotals } from "@/lib/cart";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function dt(v?: string | number | Date) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("nl-BE");
}

function units(items: Order["items"]) {
  return (items ?? []).reduce(
    (sum, it) => sum + (Number.isFinite(it.quantity) ? it.quantity : 1),
    0
  );
}

function firstPreview(items: Order["items"]): string | undefined {
  return (items ?? []).find(
    (it) => typeof it.previewDataUrl === "string" && it.previewDataUrl
  )?.previewDataUrl;
}

export default function OrdersSection({
  orders,
  busyId,
  onRefresh,
  onReorder,
}: {
  orders: Order[];
  busyId: string | null;
  onRefresh: () => void;
  onReorder: (order: Order) => void;
}) {
  return (
    <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-zinc-500">
            ORDERS
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
            Mijn orders
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Je kan je volledige order history ook openen op de aparte pagina.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/account/orders"
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Alle orders →
          </Link>

          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mt-6">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8">
            <p className="text-sm text-zinc-600">
              Je hebt nog geen orders.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/marketplace"
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Naar marketplace
              </Link>

              <Link
                href="/designer"
                className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Maak een design
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const preview = firstPreview(o.items);
              const unitTotal = units(o.items);
              const totals = computeOrderTotals(o);
              const lockId = `order:${o.id}`;
              const isBusy = busyId === lockId;

              return (
                <div
                  key={o.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-6"
                >
                  {/* TOP */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={preview}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-zinc-500">
                            No preview
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          Order {o.id}
                        </p>
                        <p className="mt-1 text-xs text-zinc-600">
                          {dt(o.createdAt)} • {unitTotal}{" "}
                          {unitTotal === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Totaal</p>
                      <p className="text-lg font-semibold text-zinc-900">
                        {eur(totals.total)}
                      </p>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <Link
                      href={`/account/orders/${encodeURIComponent(o.id)}`}
                      className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                    >
                      Bekijk details →
                    </Link>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => onReorder(o)}
                        disabled={isBusy}
                        className={`rounded-full px-4 py-2 text-sm font-medium text-white ${
                          isBusy
                            ? "cursor-not-allowed bg-zinc-300"
                            : "bg-zinc-900 hover:bg-zinc-800"
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
            })}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        Alles is local-first demo. Later migreren we naar DB + Stripe + Printful.
      </p>
    </div>
  );
}