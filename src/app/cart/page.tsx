"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCart, removeFromCart, updateQuantity, clearCart, type CartItem } from "@/lib/cart";

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  function refresh() {
    setItems(getCart());
  }

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("loopa_cart_updated", handler);
    return () => window.removeEventListener("loopa_cart_updated", handler);
  }, []);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.price * it.quantity, 0), [items]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-zinc-900">Cart</h1>
            <p className="mt-2 text-sm text-zinc-600">Review your items before checkout.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                clearCart();
                refresh();
              }}
              disabled={items.length === 0}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
            >
              Clear cart
            </button>

            <Link
              href="/checkout"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Checkout
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">
            <p className="text-zinc-700">Your cart is empty.</p>
            <Link
              href="/designer"
              className="mt-4 inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Go to designer
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <section className="lg:col-span-2 space-y-4">
              {items.map((it) => (
                <div key={it.id} className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="text-lg font-semibold text-zinc-900">{it.name}</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {it.color} • {it.size} • {it.printArea}
                      </p>
                      <p className="mt-2 text-sm text-zinc-600">
                        Unit: <span className="font-semibold text-zinc-900">{eur(it.price)}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        removeFromCart(it.id);
                        refresh();
                      }}
                      className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white">
                      <button
                        className="px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 rounded-l-full"
                        onClick={() => {
                          updateQuantity(it.id, Math.max(1, it.quantity - 1));
                          refresh();
                        }}
                      >
                        −
                      </button>
                      <div className="min-w-[48px] text-center text-sm font-medium text-zinc-900">
                        {it.quantity}
                      </div>
                      <button
                        className="px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 rounded-r-full"
                        onClick={() => {
                          updateQuantity(it.id, it.quantity + 1);
                          refresh();
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-zinc-600">Line total</p>
                      <p className="text-lg font-semibold text-zinc-900">{eur(it.price * it.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-zinc-900">Summary</h2>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-zinc-700">Subtotal</span>
                  <span className="font-semibold text-zinc-900">{eur(subtotal)}</span>
                </div>

                <p className="mt-3 text-xs text-zinc-500">Shipping + taxes are calculated at checkout.</p>

                <Link
                  href="/checkout"
                  className="mt-6 inline-flex w-full justify-center rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Checkout
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}