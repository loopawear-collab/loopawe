"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCartUI } from "@/lib/cart-ui";
import { useAppToast } from "@/lib/toast";
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
  const toast = useAppToast();

  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  function reload() {
    try {
      setItems(getCartItems());
    } catch {
      setItems([]);
    }
  }

  // Totals from lib (fallback safe)
  const totals = useMemo(() => {
    try {
      return getCartTotals();
    } catch {
      const subtotal = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
      const shipping = items.length ? 6.95 : 0;
      return { subtotal, shipping, total: subtotal + shipping };
    }
  }, [items]);

  useEffect(() => setMounted(true), []);

  // Reload when opened
  useEffect(() => {
    if (!mounted) return;
    if (isMiniCartOpen) reload();
  }, [mounted, isMiniCartOpen]);

  // Sync across tabs/windows
  useEffect(() => {
    if (!mounted) return;
    const onStorage = () => {
      if (isMiniCartOpen) reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [mounted, isMiniCartOpen]);

  // ESC closes
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
        className={`fixed right-0 top-0 z-[80] h-full w-[392px] max-w-[92vw] transform border-l border-zinc-200 bg-white shadow-xl transition-transform ${
          isMiniCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isMiniCartOpen}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
            <div>
              <p className="text-xs font-medium tracking-widest text-zinc-500">WINKELMAND</p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-900">Jouw items</h2>
            </div>

            <button
              type="button"
              onClick={closeMiniCart}
              className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              aria-label="Sluit"
            >
              ✕
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-auto px-6 py-5">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <p className="text-sm text-zinc-600">Je winkelmand is leeg.</p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/marketplace"
                    onClick={closeMiniCart}
                    className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Naar marketplace
                  </Link>
                  <Link
                    href="/designer"
                    onClick={closeMiniCart}
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Maak design
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((it) => {
                  const qty = Number(it.quantity) || 1;
                  const price = Number(it.price) || 0;

                  return (
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
                                toast.info("Item verwijderd");
                              }}
                              className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                            >
                              Verwijder
                            </button>
                          </div>

                          {/* Price + quantity */}
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-zinc-900">{eur(price)}</p>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = Math.max(1, qty - 1);
                                  updateCartQuantity(it.id, next);
                                  reload();
                                }}
                                className="h-8 w-8 rounded-full border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                                aria-label="Minder"
                              >
                                −
                              </button>

                              <span className="w-8 text-center text-sm text-zinc-900">{qty}</span>

                              <button
                                type="button"
                                onClick={() => {
                                  const next = qty + 1;
                                  updateCartQuantity(it.id, next);
                                  reload();
                                }}
                                className="h-8 w-8 rounded-full border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                                aria-label="Meer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <p className="mt-2 text-xs text-zinc-500">Regel totaal: {eur(price * qty)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-200 px-6 py-5">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-zinc-700">
                <span>Subtotaal</span>
                <span className="font-medium text-zinc-900">{eur(totals.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-zinc-700">
                <span>Verzending</span>
                <span className="font-medium text-zinc-900">{eur(totals.shipping)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-zinc-900">
                <span className="font-semibold">Totaal</span>
                <span className="font-semibold">{eur(totals.total)}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href="/cart"
                onClick={closeMiniCart}
                className="flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Bekijk cart
              </Link>

              <Link
                href="/checkout"
                onClick={closeMiniCart}
                className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-medium text-white ${
                  items.length === 0 ? "bg-zinc-300 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
                }`}
                aria-disabled={items.length === 0}
                tabIndex={items.length === 0 ? -1 : 0}
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