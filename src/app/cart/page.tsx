"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getCartItems,
  getCartTotals,
  removeCartItem,
  setCartItemQuantity,
  subscribeCartUpdated,
  type CartItem,
} from "@/lib/cart";
import { useAppToast } from "@/lib/toast";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

function productLabel(it: CartItem) {
  if (it.productType === "hoodie") return "Hoodie";
  if (it.productType === "tshirt") return "T-shirt";
  const n = (it.name || "").toLowerCase();
  if (n.includes("hoodie")) return "Hoodie";
  return it.name || "Item";
}

export default function CartPage() {
  const toast = useAppToast();

  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  function reload() {
    setItems(getCartItems());
  }

  useEffect(() => setMounted(true), []);

  // initial load
  useEffect(() => {
    if (!mounted) return;
    reload();
  }, [mounted]);

  // live sync
  useEffect(() => {
    if (!mounted) return;
    const unsub = subscribeCartUpdated(() => {
      setItems(getCartItems());
    });
    return unsub;
  }, [mounted]);

  const totals = useMemo(() => getCartTotals(items), [items]);
  const isEmpty = items.length === 0;

  if (!mounted) return null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium tracking-widest text-zinc-500">WINKELMAND</p>
            <h1 className="mt-2 text-4xl font-semibold text-zinc-900">Je items</h1>
            <p className="mt-2 text-zinc-600">
              {isEmpty ? "Je winkelmand is leeg." : `${items.length} item(s) in je winkelmand.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/marketplace"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Verder shoppen
            </Link>

            {/* Header CTA */}
            <Link
              href={isEmpty ? "/cart" : "/checkout"}
              onClick={(e) => {
                if (isEmpty) {
                  e.preventDefault();
                  toast.info("Je winkelmand is leeg. Voeg eerst een item toe.");
                }
              }}
              className={`rounded-full px-5 py-2 text-sm font-medium text-white ${
                isEmpty ? "bg-zinc-300 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
              }`}
              aria-disabled={isEmpty}
              tabIndex={isEmpty ? -1 : 0}
            >
              Checkout
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Items */}
          <section className="lg:col-span-2">
            {isEmpty ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8">
                <h2 className="text-lg font-semibold text-zinc-900">Winkelmand is leeg</h2>
                <p className="mt-2 text-zinc-600">
                  Ga naar de marketplace om een design te kiezen, of maak je eigen design.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
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
                    Naar designer
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((it) => {
                  const qty = it.quantity ?? 1;

                  return (
                    <div key={it.id} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                      <div className="flex gap-4">
                        <div className="h-20 w-20 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                          {it.previewDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.previewDataUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-zinc-500">No preview</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-900">{productLabel(it)}</p>
                              <p className="mt-1 text-xs text-zinc-600">
                                {it.color} • {it.size} • {it.printArea}
                              </p>
                              {it.designId ? (
                                <p className="mt-1 text-xs text-zinc-500">
                                  Design:{" "}
                                  <Link
                                    href={`/marketplace/${encodeURIComponent(it.designId)}`}
                                    className="hover:text-zinc-900"
                                  >
                                    view →
                                  </Link>
                                </p>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const next = removeCartItem(it.id) as unknown;
                                if (Array.isArray(next)) setItems(next);
                                else reload();
                                toast.info("Item verwijderd");
                              }}
                              className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                            >
                              Verwijder
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                            <div className="text-sm font-semibold text-zinc-900">{eur(it.price)}</div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextQty = Math.max(1, qty - 1);
                                  const next = setCartItemQuantity(it.id, nextQty) as unknown;
                                  if (Array.isArray(next)) setItems(next);
                                  else reload();
                                }}
                                className="h-9 w-9 rounded-full border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                                aria-label="Minder"
                              >
                                −
                              </button>

                              <span className="w-10 text-center text-sm text-zinc-900">{qty}</span>

                              <button
                                type="button"
                                onClick={() => {
                                  const next = setCartItemQuantity(it.id, qty + 1) as unknown;
                                  if (Array.isArray(next)) setItems(next);
                                  else reload();
                                }}
                                className="h-9 w-9 rounded-full border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                                aria-label="Meer"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-sm text-zinc-700">
                              Regel totaal:{" "}
                              <span className="font-semibold text-zinc-900">{eur(it.price * qty)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Summary */}
          <aside className="space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Overzicht</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-zinc-700">
                  <span>Subtotaal</span>
                  <span className="font-medium text-zinc-900">{eur(totals.subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-700">
                  <span>Verzending</span>
                  <span className="font-medium text-zinc-900">{eur(totals.shipping)}</span>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
                  <span className="font-semibold text-zinc-900">Totaal</span>
                  <span className="font-semibold text-zinc-900">{eur(totals.total)}</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href={isEmpty ? "/cart" : "/checkout"}
                  onClick={(e) => {
                    if (isEmpty) {
                      e.preventDefault();
                      toast.info("Je winkelmand is leeg. Voeg eerst een item toe.");
                    }
                  }}
                  className={`block w-full rounded-full px-5 py-3 text-center text-sm font-medium text-white ${
                    isEmpty ? "bg-zinc-300 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
                  }`}
                  aria-disabled={isEmpty}
                  tabIndex={isEmpty ? -1 : 0}
                >
                  Naar checkout
                </Link>

                {isEmpty ? (
                  <p className="mt-3 text-xs text-zinc-500">
                    Voeg eerst een item toe via de marketplace of de designer.
                  </p>
                ) : null}
              </div>

              <p className="mt-3 text-xs text-zinc-500">Later: VAT/taxes + real shipping via Printful.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}