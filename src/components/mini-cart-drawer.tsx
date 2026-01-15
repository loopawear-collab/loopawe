"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCartItems, getCartSubtotal, type CartItem } from "@/lib/cart";
import { useCartUI } from "@/lib/cart-ui";

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

export default function MiniCartDrawer() {
  const { isMiniCartOpen, lastAdded, closeMiniCart } = useCartUI();

  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  const panelRef = useRef<HTMLDivElement | null>(null);

  // Refresh cart snapshot whenever drawer opens
  useEffect(() => {
    if (!isMiniCartOpen) return;
    const next = getCartItems();
    setItems(next);
    setSubtotal(getCartSubtotal());
  }, [isMiniCartOpen]);

  // Close on ESC
  useEffect(() => {
    if (!isMiniCartOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMiniCart();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMiniCartOpen, closeMiniCart]);

  // Autofocus drawer when open (nice UX)
  useEffect(() => {
    if (!isMiniCartOpen) return;
    window.setTimeout(() => panelRef.current?.focus(), 50);
  }, [isMiniCartOpen]);

  const count = useMemo(() => items.reduce((s, it) => s + it.quantity, 0), [items]);

  // Optional: auto-close after a few seconds (only if user doesn't interact)
  useEffect(() => {
    if (!isMiniCartOpen) return;
    let alive = true;

    const t = window.setTimeout(() => {
      if (!alive) return;
      closeMiniCart();
    }, 6500);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [isMiniCartOpen, closeMiniCart]);

  if (!isMiniCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* overlay */}
      <button
        aria-label="Close cart drawer"
        onClick={closeMiniCart}
        className="absolute inset-0 bg-black/35"
      />

      {/* panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-2xl outline-none"
        role="dialog"
        aria-modal="true"
        aria-label="Cart drawer"
      >
        <div className="flex h-full flex-col">
          {/* header */}
          <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-5">
            <div>
              <p className="text-xs font-semibold tracking-[0.35em] text-zinc-400">CART</p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-900">Added to cart</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {count} item{count === 1 ? "" : "s"} • Subtotal{" "}
                <span className="font-medium text-zinc-900">{eur(subtotal)}</span>
              </p>
            </div>

            <button
              onClick={closeMiniCart}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Close
            </button>
          </div>

          {/* body */}
          <div className="flex-1 overflow-auto px-6 py-6">
            {/* last added highlight */}
            {lastAdded ? (
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-xs font-semibold text-zinc-500">Just added</p>

                <div className="mt-4 flex gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-200 bg-white flex items-center justify-center">
                    {lastAdded.previewDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lastAdded.previewDataUrl}
                        alt={lastAdded.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-zinc-500">Preview</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">{lastAdded.name}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {lastAdded.color} • {lastAdded.size} • {lastAdded.printArea}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900">{eur(lastAdded.price)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* cart items list (compact) */}
            <div className="mt-6">
              <p className="text-sm font-semibold text-zinc-900">In your cart</p>

              <div className="mt-3 space-y-3">
                {items.slice(0, 4).map((it) => (
                  <div key={it.id} className="flex items-start justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">{it.name}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {it.color} • {it.size} • {it.printArea} • x{it.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900">{eur(it.price * it.quantity)}</p>
                  </div>
                ))}

                {items.length > 4 ? (
                  <p className="text-xs text-zinc-500">+ {items.length - 4} more items</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="border-t border-zinc-200 px-6 py-5">
            <div className="flex gap-3">
              <Link
                href="/cart"
                onClick={closeMiniCart}
                className="flex-1 rounded-full bg-zinc-900 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800"
              >
                View cart
              </Link>

              <Link
                href="/checkout"
                onClick={closeMiniCart}
                className="flex-1 rounded-full border border-zinc-200 bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Checkout
              </Link>
            </div>

            <button
              onClick={closeMiniCart}
              className="mt-3 w-full text-center text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Continue shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}