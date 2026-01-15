// src/app/checkout/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createOrder, getCartItems, type ShippingAddress } from "@/lib/cart";

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useMemo(() => getCartItems(), []);
  const subtotal = useMemo(() => cart.reduce((s, it) => s + it.price * it.quantity, 0), [cart]);

  const [form, setForm] = useState<ShippingAddress>({
    name: "",
    address1: "",
    address2: "",
    zip: "",
    city: "",
    country: "Belgium",
  });

  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ShippingAddress>(key: K, value: ShippingAddress[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!cart.length) {
      setError("Your cart is empty.");
      return;
    }

    if (!form.name || !form.address1 || !form.zip || !form.city || !form.country) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      const order = createOrder(form);
      router.push(`/success/${encodeURIComponent(order.id)}`);
    } catch (err: any) {
      setError(String(err?.message ?? "Checkout failed"));
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-zinc-900">Checkout</h1>
          <p className="mt-2 text-zinc-600">{cart.length} items</p>
        </div>
        <Link
          href="/cart"
          className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Back to cart
        </Link>
      </div>

      {cart.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Cart is empty</h2>
          <p className="mt-2 text-zinc-600">Go back to the marketplace to add a design.</p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Marketplace
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* form */}
          <section className="lg:col-span-2">
            <form onSubmit={onSubmit} className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Shipping address</h2>

              {error ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600">Full name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600">Address line 1 *</label>
                  <input
                    value={form.address1}
                    onChange={(e) => update("address1", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600">Address line 2</label>
                  <input
                    value={form.address2 ?? ""}
                    onChange={(e) => update("address2", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600">ZIP *</label>
                  <input
                    value={form.zip}
                    onChange={(e) => update("zip", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600">City *</label>
                  <input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600">Country *</label>
                  <input
                    value={form.country}
                    onChange={(e) => update("country", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-8 inline-flex w-full justify-center rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Place order
              </button>

              <p className="mt-4 text-xs text-zinc-500">
                This is an MVP order. Next: Stripe payment + Printful fulfilment.
              </p>
            </form>
          </section>

          {/* summary */}
          <aside className="space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Order summary</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-zinc-700">
                  <span>Subtotal</span>
                  <span className="font-medium text-zinc-900">{eur(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-700">
                  <span>Shipping</span>
                  <span className="text-zinc-500">€6,95 (MVP)</span>
                </div>

                <div className="border-t border-zinc-200 pt-4 flex items-center justify-between">
                  <span className="font-semibold text-zinc-900">Total</span>
                  <span className="font-semibold text-zinc-900">{eur(subtotal + 6.95)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}