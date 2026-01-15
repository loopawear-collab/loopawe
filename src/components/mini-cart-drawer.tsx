"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCartUI } from "@/lib/cart-ui";
import {
  getCartItems,
  getCartTotals,
  removeFromCart,
  updateCartQuantity,
  type CartItem,
} from "@/lib/cart";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

export default function MiniCartDrawer() {
  const { isMiniCartOpen, closeMiniCart } = useCartUI();

  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  const totals = useMemo(() => {
    try {
      return getCartTotals();
    } catch {
      const subtotal = items.reduce((sum, it) => sum + (it.price ?? 0) * (it.quantity ?? 1), 0);
      const shipping = items.length > 0 ? 6.95 : 0;
      return { subtotal, shipping, total: subtotal + shipping };
    }
  }, [items]);

  function reload() {
    try {
      setItems(getCartItems());
    } catch {
      setItems([]);
    }
  }

  // initial mount
  useEffect(() => {
    setMounted(true);
    reload();
  }, []);

  // reload whenever drawer opens
  useEffect(() => {
    if (!mounted) return;
    if (isMiniCartOpen) reload();
  }, [mounted, isMiniCartOpen]);

  // close on ESC
  useEffect(() => {
    if (!isMiniCartOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMiniCart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMiniCartOpen, closeMiniCart]);

  if (!mounted) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[70] bg-black/30 transition-opacity ${
          isMiniCartOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeMiniCart}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-[80] h-full w-[390px] max-w-[90vw] transform border-l border-zinc-200 bg-white shadow-xl transition-transform ${
          isMiniCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isMiniCartOpen}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
            <div>
              <p className="text-xs font-medium tracking-widest text-zinc-500">CART</p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-900">Your items</h2>
            </div>

            <button
              type="button"
              onClick={closeMiniCart}
              className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              aria-label="Close mini cart"
            >
              ✕
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-auto px-6 py-5">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <p className="text-sm text-zinc-600">Je cart is leeg.</p>

                <div className="mt-4 flex gap-3">
                  <Link
                    href="/marketplace"
                    onClick={closeMiniCart}
                    className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Browse marketplace
                  </Link>

                  <Link
                    href="/designer"
                    onClick={closeMiniCart}
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Create design
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((it) => (
                  <div key={it.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex gap-3">
                      {/* Preview */}
                      <div className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                        {it.previewDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.previewDataUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-zinc-500">No preview</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-900">{it.name}</p>
                            <p className="mt-1 text-xs text-zinc-600">
                              {it.color} • {it.size} • {it.printArea}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              removeFromCart(it.id);
                              reload();
                            }}
                            className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-zinc-900">{eur(it.price)}</p>

                          {/* Quantity */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.max(1, (it.quantity ?? 1) - 1);
                                updateCartQuantity(it.id, next);
                                reload();
                              }}
                              className="h-8 w-8 rounded-full border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>

                            <span className="w-8 text-center text-sm text-zinc-900">{it.quantity ?? 1}</span>

                            <button
                              type="button"
                              onClick={() => {
                                const next = (it.quantity ?? 1) + 1;
                                updateCartQuantity(it.id, next);
                                reload();
                              }}
                              className="h-8 w-8 rounded-full border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-zinc-500">
                          Line total: {eur((it.price ?? 0) * (it.quantity ?? 1))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-200 px-6 py-5">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-zinc-700">
                <span>Subtotal</span>
                <span className="font-medium text-zinc-900">{eur(totals.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-zinc-700">
                <span>Shipping</span>
                <span className="font-medium text-zinc-900">{eur(totals.shipping)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-zinc-900">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">{eur(totals.total)}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href="/cart"
                onClick={closeMiniCart}
                className="flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                View cart
              </Link>

              <Link
                href="/checkout"
                onClick={closeMiniCart}
                className="flex-1 rounded-full bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800"
              >
                Checkout
              </Link>
            </div>

            <p className="mt-3 text-[11px] text-zinc-500">
              Demo checkout (local-first). Later: Stripe + Printful fulfilment.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}