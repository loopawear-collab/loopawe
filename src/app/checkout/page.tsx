"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createOrder, getCart, type CartItem, type ShippingAddress } from "@/lib/cart";

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [addr, setAddr] = useState<ShippingAddress>({
    name: "",
    address1: "",
    address2: "",
    zip: "",
    city: "",
    country: "Belgium",
  });

  useEffect(() => {
    setItems(getCart());
  }, []);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.price * it.quantity, 0), [items]);
  const shipping = 6.95;
  const total = subtotal + (items.length ? shipping : 0);

  const formOk =
    addr.name.trim() &&
    addr.address1.trim() &&
    addr.zip.trim() &&
    addr.city.trim() &&
    addr.country.trim();

  async function place() {
    setErr(null);

    if (!items.length) {
      setErr("Your cart is empty.");
      return;
    }
    if (!formOk) {
      setErr("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const order = createOrder({
        shippingAddress: {
          name: addr.name.trim(),
          address1: addr.address1.trim(),
          address2: addr.address2?.trim() ? addr.address2.trim() : undefined,
          zip: addr.zip.trim(),
          city: addr.city.trim(),
          country: addr.country.trim(),
        },
        shipping,
      });

      router.push(`/success/${encodeURIComponent(order.id)}`);
    } catch (e: any) {
      setErr(e?.message ?? "Checkout failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-4xl font-semibold text-zinc-900">Checkout</h1>
              <p className="mt-2 text-sm text-zinc-600">Demo checkout — Stripe comes later.</p>
            </div>
            <Link
              href="/cart"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Back to cart
            </Link>
          </div>

          <div className="mt-10">
            <h2 className="text-sm font-semibold text-zinc-900">Shipping details</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="md:col-span-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400"
                placeholder="Full name*"
                value={addr.name}
                onChange={(e) => setAddr((a) => ({ ...a, name: e.target.value }))}
              />
              <input
                className="md:col-span-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400"
                placeholder="Street + number*"
                value={addr.address1}
                onChange={(e) => setAddr((a) => ({ ...a, address1: e.target.value }))}
              />
              <input
                className="md:col-span-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400"
                placeholder="Address line 2"
                value={addr.address2 ?? ""}
                onChange={(e) => setAddr((a) => ({ ...a, address2: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400"
                placeholder="ZIP*"
                value={addr.zip}
                onChange={(e) => setAddr((a) => ({ ...a, zip: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400"
                placeholder="City*"
                value={addr.city}
                onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))}
              />
              <input
                className="md:col-span-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400"
                placeholder="Country*"
                value={addr.country}
                onChange={(e) => setAddr((a) => ({ ...a, country: e.target.value }))}
              />
            </div>

            {err && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {err}
              </div>
            )}

            <button
              onClick={place}
              disabled={loading}
              className="mt-8 w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? "Placing..." : "Place order"}
            </button>
          </div>
        </section>

        <aside className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Summary</h2>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-zinc-700">
              <span>Subtotal</span>
              <span className="font-semibold text-zinc-900">{eur(subtotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-700">
              <span>Shipping</span>
              <span className="font-semibold text-zinc-900">{items.length ? eur(shipping) : eur(0)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-zinc-200 pt-3">
              <span className="font-semibold text-zinc-900">Total</span>
              <span className="font-semibold text-zinc-900">{eur(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}