// src/app/cart/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getCartItems,
  removeCartItem,
  setCartItemQuantity,
  getCartSubtotal,
  type CartItem,
} from "@/lib/cart";

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCartItems());
  }, []);

  const subtotal = useMemo(() => getCartSubtotal(), [items]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-zinc-900">Cart</h1>
          <p className="mt-2 text-zinc-600">{items.length} items</p>
        </div>
        <Link
          href="/marketplace"
          className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Continue shopping
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Your cart is empty</h2>
          <p className="mt-2 text-zinc-600">Add a design from the marketplace.</p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Go to marketplace
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* items */}
          <section className="lg:col-span-2 space-y-4">
            {items.map((it) => (
              <div
                key={it.id}
                className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                      {it.previewDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.previewDataUrl} alt={it.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-zinc-500">Preview</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-zinc-900">{it.name}</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {it.color} • {it.size} • {it.printArea}
                        {it.productType ? ` • ${it.productType.toUpperCase()}` : ""}
                      </p>
                      {it.designId ? (
                        <p className="mt-1 text-xs text-zinc-500">Design: {it.designId}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start">
                    <p className="text-lg font-semibold text-zinc-900">{eur(it.price)}</p>

                    <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white">
                      <button
                        className="rounded-l-full px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                        onClick={() => {
                          const next = setCartItemQuantity(it.id, Math.max(1, it.quantity - 1));
                          setItems(next);
                        }}
                      >
                        −
                      </button>
                      <div className="min-w-[56px] text-center text-sm font-semibold text-zinc-900">
                        {it.quantity}
                      </div>
                      <button
                        className="rounded-r-full px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                        onClick={() => {
                          const next = setCartItemQuantity(it.id, it.quantity + 1);
                          setItems(next);
                        }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="text-sm font-medium text-red-700 hover:text-red-800"
                      onClick={() => {
                        const next = removeCartItem(it.id);
                        setItems(next);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* summary */}
          <aside className="space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Summary</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-zinc-700">
                  <span>Subtotal</span>
                  <span className="font-medium text-zinc-900">{eur(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-700">
                  <span>Shipping</span>
                  <span className="text-zinc-500">Calculated at checkout</span>
                </div>

                <div className="border-t border-zinc-200 pt-4 flex items-center justify-between">
                  <span className="font-semibold text-zinc-900">Total</span>
                  <span className="font-semibold text-zinc-900">{eur(subtotal)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-6 inline-flex w-full justify-center rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Go to checkout
              </Link>

              <p className="mt-4 text-xs text-zinc-500">
                Next: Stripe payment + Printful fulfilment.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}