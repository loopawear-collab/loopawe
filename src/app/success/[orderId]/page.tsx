"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getOrderById } from "@/lib/cart";

type OrderItem = {
  id?: string;
  name: string;
  color: string;
  size: string;
  printArea: string;
  price: number;
  quantity: number;
  designId?: string;
  previewDataUrl?: string;
};

type ShippingAddress = {
  name?: string;
  address1?: string;
  address2?: string;
  zip?: string;
  city?: string;
  country?: string;
};

type Order = {
  id: string;
  createdAt?: string | number | Date;
  items: OrderItem[];
  subtotal?: number;
  shipping?: number;
  total?: number;
  shippingAddress?: ShippingAddress;
};

function formatEUR(value: number) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function SuccessPage() {
  // ✅ Next 16 fix: params halen via useParams() in client component
  const params = useParams<{ orderId?: string }>();
  const orderId = useMemo(() => {
    const raw = params?.orderId ?? "";
    return raw ? decodeURIComponent(String(raw)) : "";
  }, [params]);

  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!orderId) return;

    // getOrderById leest localStorage → enkel client-side
    const found = getOrderById(orderId) as Order | null;
    setOrder(found);
  }, [mounted, orderId]);

  const computed = useMemo(() => {
    if (!order) return null;

    const itemsSubtotal =
      typeof order.subtotal === "number"
        ? order.subtotal
        : order.items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);

    const shipping = typeof order.shipping === "number" ? order.shipping : 6.95;
    const total = typeof order.total === "number" ? order.total : itemsSubtotal + shipping;

    const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();

    return {
      itemsSubtotal,
      shipping,
      total,
      createdAtText: createdAt.toLocaleString("nl-BE"),
    };
  }, [order]);

  // ✅ Geen hydration warnings: pas renderen als mounted true is
  if (!mounted) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <p className="text-sm text-zinc-600">Loading…</p>
        </div>
      </main>
    );
  }

  if (!orderId || !order || !computed) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-semibold text-zinc-900">Order not found</h1>
          <p className="mt-2 text-zinc-600">
            We couldn't load your order. This can happen if you cleared storage or opened the link in another browser.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Home
            </Link>
            <Link
              href="/cart"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Back to cart
            </Link>
          </div>

          <p className="mt-8 text-xs text-zinc-500">
            Tip: later koppelen we orders aan je account (DB) zodat dit altijd terug te vinden is.
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
            <h1 className="text-4xl font-semibold text-zinc-900">
              Order placed <span className="align-middle">✓</span>
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
              Continue designing
            </Link>
            <Link
              href="/"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Content grid */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Items */}
          <section className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900">Items</h2>

            <div className="mt-4 space-y-4">
              {order.items.map((it, idx) => (
                <div
                  key={it.id ?? `${it.name}-${idx}`}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-6 py-5"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{it.name}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {it.color} • {it.size} • {it.printArea} • x{it.quantity}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-medium text-zinc-900">{formatEUR(Number(it.price) || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Summary */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Summary</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-zinc-700">
                  <span>Subtotal</span>
                  <span className="font-medium text-zinc-900">{formatEUR(computed.itemsSubtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-700">
                  <span>Shipping</span>
                  <span className="font-medium text-zinc-900">{formatEUR(computed.shipping)}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-700">
                  <span>Taxes</span>
                  <span className="text-zinc-500">Later</span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4">
                  <span className="font-semibold text-zinc-900">Total</span>
                  <span className="font-semibold text-zinc-900">{formatEUR(computed.total)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Shipping to</h2>

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
                Next: connect Stripe payment + Printful fulfilment to make this real.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}