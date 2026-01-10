"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ProductType = "tshirt" | "hoodie";
type PrintArea = "front" | "back" | "both";
type Size = "S" | "M" | "L" | "XL" | "XXXL";

type CartItem = {
  id: string;
  createdAt: number;

  productType: ProductType;
  colorName: string;
  colorHex: string;
  size: Size;
  quantity: number;

  printArea: PrintArea;
  unitPrice: number;

  designDataUrl: string | null;
  designScale: number;
  designX: number;
  designY: number;
};

const CART_KEY = "loopa_cart_v1";

function money(n: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function labelProduct(t: ProductType) {
  return t === "tshirt" ? "T-shirt" : "Hoodie";
}

function labelArea(a: PrintArea) {
  if (a === "front") return "Front";
  if (a === "back") return "Back";
  return "Front + Back";
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadCart());
  }, []);

  const subtotal = useMemo(() => {
    const s = items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
    return Math.round(s * 100) / 100;
  }, [items]);

  function updateItem(id: string, patch: Partial<CartItem>) {
    setItems((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, ...patch } : it));
      saveCart(next);
      return next;
    });
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      saveCart(next);
      return next;
    });
    setToast("Removed ✓");
    window.setTimeout(() => setToast(null), 1200);
  }

  function clearCart() {
    setItems([]);
    saveCart([]);
    setToast("Cart cleared ✓");
    window.setTimeout(() => setToast(null), 1200);
  }

  function goCheckout() {
    if (items.length === 0) {
      setToast("Your cart is empty");
      window.setTimeout(() => setToast(null), 1200);
      return;
    }
    router.push("/checkout");
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">Cart</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Review your items. Checkout UI is ready — payments will be connected next.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/designer"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Continue designing
          </Link>

          <button
            onClick={clearCart}
            disabled={items.length === 0}
            className="rounded-full bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-200 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {toast && (
        <div className="mt-6 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white">
          {toast}
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Your cart is empty</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Go to the designer and create your first product.
              </p>
              <div className="mt-6">
                <Link
                  href="/designer"
                  className="inline-flex rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Go to designer
                </Link>
              </div>
            </div>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex gap-5">
                  {/* Thumbnail */}
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-black/5">
                    {it.designDataUrl ? (
                      <img
                        src={it.designDataUrl}
                        alt="Design"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {labelProduct(it.productType)}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-sm border border-black/10"
                              style={{ backgroundColor: it.colorHex }}
                            />
                            {it.colorName}
                          </span>
                          <span className="mx-2 text-zinc-300">•</span>
                          Size {it.size}
                          <span className="mx-2 text-zinc-300">•</span>
                          {labelArea(it.printArea)}
                        </p>
                      </div>

                      <button
                        onClick={() => removeItem(it.id)}
                        className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-200"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Controls */}
                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateItem(it.id, { quantity: clamp(it.quantity - 1, 1, 20) })
                          }
                          className="h-10 w-10 rounded-xl bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                          aria-label="Decrease quantity"
                        >
                          –
                        </button>
                        <input
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(it.id, {
                              quantity: clamp(parseInt(e.target.value || "1", 10), 1, 20),
                            })
                          }
                          className="h-10 w-20 rounded-xl border border-zinc-200 bg-white text-center text-sm font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                          inputMode="numeric"
                        />
                        <button
                          onClick={() =>
                            updateItem(it.id, { quantity: clamp(it.quantity + 1, 1, 20) })
                          }
                          className="h-10 w-10 rounded-xl bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-zinc-500">Unit</p>
                        <p className="text-sm font-semibold text-zinc-900">
                          {money(it.unitPrice)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-zinc-500">Line</p>
                        <p className="text-sm font-semibold text-zinc-900">
                          {money(Math.round(it.unitPrice * it.quantity * 100) / 100)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Summary</h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between text-zinc-700">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-900">{money(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-zinc-700">
                <span>Shipping</span>
                <span className="text-zinc-500">Calculated at checkout</span>
              </div>

              <div className="flex items-center justify-between text-zinc-700">
                <span>Taxes</span>
                <span className="text-zinc-500">Calculated at checkout</span>
              </div>

              <div className="mt-4 h-px bg-zinc-200" />

              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">Total</span>
                <span className="font-semibold text-zinc-900">{money(subtotal)}</span>
              </div>

              <button
                onClick={goCheckout}
                disabled={items.length === 0}
                className="mt-4 w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Checkout
              </button>

              <p className="mt-3 text-xs text-zinc-500">
                Next step: connect Stripe + Printful so checkout creates real orders automatically.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900">Tip</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Want a cleaner brand feel? We’ll add your Loopa logo + favicon next.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}