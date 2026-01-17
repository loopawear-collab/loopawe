"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCartUI } from "@/lib/cart-ui";
import {
  getCartItems,
  getCartTotals,
  removeCartItem,
  setCartItemQuantity,
  type CartItem,
  subscribeCartUpdated,
} from "@/lib/cart";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export default function MiniCartDrawer() {
  const { isOpen, close } = useCartUI();

  const [items, setItems] = useState<CartItem[]>([]);

  // initial load + live updates
  useEffect(() => {
    setItems(getCartItems());

    const unsub = subscribeCartUpdated(() => {
      setItems(getCartItems());
    });

    return unsub;
  }, []);

  const totals = useMemo(() => getCartTotals(items), [items]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={close}
      />

      {/* Drawer */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Your cart</h2>
          <button
            onClick={close}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Close ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-500">Your cart is empty.</p>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 p-4"
              >
                <div>
                  <p className="font-medium text-zinc-900">{it.name}</p>
                  <p className="text-sm text-zinc-600">
                    {it.color} • {it.size} • {it.printArea}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCartItemQuantity(it.id, Math.max(1, it.quantity - 1))
                      }
                      className="rounded border px-2 py-1 text-sm"
                    >
                      −
                    </button>
                    <span className="text-sm">{it.quantity}</span>
                    <button
                      onClick={() =>
                        setCartItemQuantity(it.id, it.quantity + 1)
                      }
                      className="rounded border px-2 py-1 text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-medium text-zinc-900">
                    {eur(it.price * it.quantity)}
                  </p>
                  <button
                    onClick={() => removeCartItem(it.id)}
                    className="mt-2 text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-6 py-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-medium">{eur(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span className="font-medium">{eur(totals.shipping)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{eur(totals.total)}</span>
          </div>

          <Link
            href="/cart"
            onClick={close}
            className="block w-full rounded-full bg-zinc-900 py-3 text-center text-sm font-medium text-white hover:bg-zinc-800"
          >
            Go to cart
          </Link>
        </div>
      </aside>
    </div>
  );
}