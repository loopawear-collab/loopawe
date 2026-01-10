"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getLastOrder, getOrderById } from "@/lib/orders";

function money(n: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

export default function SuccessPage({ searchParams }: { searchParams: { orderId?: string } }) {
  const orderId = searchParams?.orderId;

  const order = useMemo(() => {
    if (orderId) return getOrderById(orderId);
    return getLastOrder();
  }, [orderId]);

  if (!order) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">No order found</h1>
          <p className="mt-2 text-sm text-zinc-600">Place an order first from checkout.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/designer" className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800">
              Go to designer
            </Link>
            <Link href="/" className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">Order placed ✓</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Order <span className="font-semibold text-zinc-900">{order.id}</span> •{" "}
              {new Date(order.createdAt).toLocaleString("nl-BE")}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/account"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              View in account
            </Link>
            <Link
              href="/designer"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              New design
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900">Items</h2>

            <div className="mt-4 space-y-4">
              {order.items.map((it) => (
                <div key={it.id} className="rounded-2xl border border-zinc-200 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {it.productType === "tshirt" ? "T-shirt" : "Hoodie"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {it.colorName} • {it.size} • {it.printArea} • x{it.quantity}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-zinc-900">
                      {money(Math.round(it.unitPrice * it.quantity * 100) / 100)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Summary</h2>
            <div className="mt-4 rounded-2xl border border-zinc-200 p-5 text-sm">
              <div className="flex justify-between text-zinc-700">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-900">{money(order.subtotal)}</span>
              </div>
              <div className="mt-2 flex justify-between text-zinc-700">
                <span>Shipping</span>
                <span className="font-semibold text-zinc-900">{money(order.shippingCost)}</span>
              </div>
              <div className="mt-2 flex justify-between text-zinc-700">
                <span>Taxes</span>
                <span className="font-semibold text-zinc-900">{money(order.taxes)}</span>
              </div>
              <div className="my-4 h-px bg-zinc-200" />
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-900">Total</span>
                <span className="font-semibold text-zinc-900">{money(order.total)}</span>
              </div>
            </div>

            <h2 className="mt-8 text-sm font-semibold text-zinc-900">Shipping to</h2>
            <div className="mt-4 rounded-2xl border border-zinc-200 p-5 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">{order.shipping.fullName}</p>
              <p className="mt-1">{order.shipping.street}</p>
              <p className="mt-1">
                {order.shipping.zip} {order.shipping.city}
              </p>
              <p className="mt-1">{order.shipping.country}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}