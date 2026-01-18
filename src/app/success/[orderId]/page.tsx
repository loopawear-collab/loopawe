"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getOrderById, computeOrderTotals, type Order } from "@/lib/cart";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

function dt(v?: string | number | Date) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("nl-BE");
}

export default function SuccessPage() {
  const params = useParams<{ orderId?: string }>();
  const orderId = useMemo(() => {
    const raw = params?.orderId ?? "";
    return raw ? decodeURIComponent(String(raw)) : "";
  }, [params]);

  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!orderId) return;

    const found = getOrderById(orderId);
    setOrder(found);
  }, [mounted, orderId]);

  const computed = useMemo(() => {
    if (!order) return null;
    const totals = computeOrderTotals(order);
    return {
      ...totals,
      createdAtText: dt(order.createdAt),
    };
  }, [order]);

  if (!mounted) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <p className="text-sm text-zinc-600">Bezig met laden…</p>
        </div>
      </main>
    );
  }

  if (!orderId || !order || !computed) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <p className="text-xs font-medium tracking-widest text-zinc-500">SUCCESS</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Order niet gevonden</h1>
          <p className="mt-2 text-zinc-600">
            We konden je order niet laden. Dit kan gebeuren als je storage werd gewist of als je de link in een andere
            browser opende.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/marketplace"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Naar marketplace
            </Link>
            <Link
              href="/cart"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Terug naar cart
            </Link>
          </div>

          <p className="mt-8 text-xs text-zinc-500">
            Tip: later koppelen we orders aan je account (DB), zodat dit altijd terug te vinden is.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium tracking-widest text-zinc-500">SUCCESS</p>
            <h1 className="mt-2 text-4xl font-semibold text-zinc-900">
              Order geplaatst <span className="align-middle">✓</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Order <span className="font-medium text-zinc-900">{order.id}</span> • {computed.createdAtText}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/designer"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Nieuw design maken
            </Link>
            <Link
              href="/account"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Naar account
            </Link>
          </div>
        </div>

        {/* Content grid */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Items */}
          <section className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900">Items</h2>

            <div className="mt-4 space-y-4">
              {order.items.map((it, idx) => {
                const qty = it.quantity ?? 1;
                const price = Number.isFinite(it.price) ? it.price : 0;

                return (
                  <div
                    key={it.id ?? `${it.name}-${idx}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-5"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-14 w-14 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                        {(it as any).previewDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={(it as any).previewDataUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-zinc-500">No preview</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-900">{it.name}</p>
                        <p className="mt-1 text-sm text-zinc-600">
                          {it.color} • {it.size} • {it.printArea} • x{qty}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-medium text-zinc-900">{eur(price)}</p>
                      <p className="text-xs text-zinc-500">{eur(price * qty)} totaal</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Summary */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Overzicht</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-zinc-700">
                  <span>Subtotaal</span>
                  <span className="font-medium text-zinc-900">{eur(computed.subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-700">
                  <span>Verzending</span>
                  <span className="font-medium text-zinc-900">{eur(computed.shipping)}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-700">
                  <span>BTW</span>
                  <span className="text-zinc-500">Later</span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4">
                  <span className="font-semibold text-zinc-900">Totaal</span>
                  <span className="font-semibold text-zinc-900">{eur(computed.total)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Levering</h2>

              <div className="mt-4 text-sm text-zinc-700">
                <p className="font-medium text-zinc-900">{order.shippingAddress?.name ?? "—"}</p>
                <p>{order.shippingAddress?.address1 ?? "—"}</p>
                {order.shippingAddress?.address2 ? <p>{order.shippingAddress.address2}</p> : null}
                <p>
                  {(order.shippingAddress?.zip ?? "—") + " " + (order.shippingAddress?.city ?? "")}
                </p>
                <p>{order.shippingAddress?.country ?? "—"}</p>
              </div>

              <p className="mt-6 text-xs text-zinc-500">
                Next: Stripe betaling + Printful fulfilment.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}