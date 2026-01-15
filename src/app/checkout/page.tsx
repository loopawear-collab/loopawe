"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOrder,
  getCartItems,
  getCartSubtotal,
  type CartItem,
  type ShippingAddress,
} from "@/lib/cart";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

type FieldErrors = Partial<Record<keyof ShippingAddress, string>>;

export default function CheckoutPage() {
  const router = useRouter();

  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  const shipping = 6.95;
  const total = useMemo(() => subtotal + shipping, [subtotal]);

  const [form, setForm] = useState<ShippingAddress>({
    name: "",
    address1: "",
    address2: "",
    zip: "",
    city: "",
    country: "Belgium",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  useEffect(() => {
    const cart = getCartItems();
    setItems(cart);
    setSubtotal(getCartSubtotal());
  }, []);

  function setField<K extends keyof ShippingAddress>(key: K, value: ShippingAddress[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setSubmitError(null);
  }

  function validate(): boolean {
    const next: FieldErrors = {};

    if (!form.name.trim()) next.name = "Required";
    if (!form.address1.trim()) next.address1 = "Required";
    if (!form.zip.trim()) next.zip = "Required";
    if (!form.city.trim()) next.city = "Required";
    if (!form.country.trim()) next.country = "Required";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (items.length === 0) {
      setSubmitError("Your cart is empty.");
      return;
    }

    if (!validate()) {
      setSubmitError("Please fix the highlighted fields.");
      return;
    }

    setIsPlacing(true);
    try {
      const order = createOrder(form);
      router.push(`/success/${encodeURIComponent(order.id)}`);
    } catch (err: any) {
      setSubmitError(String(err?.message ?? "Checkout failed"));
    } finally {
      setIsPlacing(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-zinc-900">Checkout</h1>
          <p className="mt-2 text-zinc-600">{items.length} item(s)</p>
        </div>

        <Link
          href="/cart"
          className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Back to cart
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Your cart is empty</h2>
          <p className="mt-2 text-zinc-600">Add a design from the marketplace first.</p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Go to marketplace
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* LEFT: form */}
          <section className="lg:col-span-2">
            <form
              onSubmit={onSubmit}
              className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold tracking-[0.35em] text-zinc-400">SHIPPING</p>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Delivery details</h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    Fill in your address. Payment comes later (Stripe).
                  </p>
                </div>

                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-700">
                  MVP checkout
                </span>
              </div>

              {submitError ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              ) : null}

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600">Full name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className={[
                      "mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10",
                      errors.name ? "border-red-300" : "border-zinc-200",
                    ].join(" ")}
                    placeholder="Mattias Wevers"
                  />
                  {errors.name ? <p className="mt-1 text-xs text-red-700">{errors.name}</p> : null}
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600">Address line 1 *</label>
                  <input
                    value={form.address1}
                    onChange={(e) => setField("address1", e.target.value)}
                    className={[
                      "mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10",
                      errors.address1 ? "border-red-300" : "border-zinc-200",
                    ].join(" ")}
                    placeholder="Street + number"
                  />
                  {errors.address1 ? (
                    <p className="mt-1 text-xs text-red-700">{errors.address1}</p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600">Address line 2</label>
                  <input
                    value={form.address2 ?? ""}
                    onChange={(e) => setField("address2", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="Apartment, unit, … (optional)"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600">ZIP *</label>
                  <input
                    value={form.zip}
                    onChange={(e) => setField("zip", e.target.value)}
                    className={[
                      "mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10",
                      errors.zip ? "border-red-300" : "border-zinc-200",
                    ].join(" ")}
                    placeholder="3740"
                  />
                  {errors.zip ? <p className="mt-1 text-xs text-red-700">{errors.zip}</p> : null}
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600">City *</label>
                  <input
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    className={[
                      "mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10",
                      errors.city ? "border-red-300" : "border-zinc-200",
                    ].join(" ")}
                    placeholder="Bilzen"
                  />
                  {errors.city ? <p className="mt-1 text-xs text-red-700">{errors.city}</p> : null}
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600">Country *</label>
                  <input
                    value={form.country}
                    onChange={(e) => setField("country", e.target.value)}
                    className={[
                      "mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10",
                      errors.country ? "border-red-300" : "border-zinc-200",
                    ].join(" ")}
                    placeholder="Belgium"
                  />
                  {errors.country ? (
                    <p className="mt-1 text-xs text-red-700">{errors.country}</p>
                  ) : null}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPlacing}
                className="mt-8 inline-flex w-full justify-center rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {isPlacing ? "Placing order…" : "Place order"}
              </button>

              <p className="mt-4 text-xs text-zinc-500">
                This is an MVP order flow. Next step: Stripe payment + Printful fulfilment.
              </p>
            </form>
          </section>

          {/* RIGHT: sticky summary */}
          <aside className="lg:sticky lg:top-24 h-fit space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Order summary</h2>

              <div className="mt-4 space-y-4">
                {items.map((it) => (
                  <div key={it.id} className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 min-w-0">
                      <div className="h-12 w-12 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                        {it.previewDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={it.previewDataUrl}
                            alt={it.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-zinc-500">Preview</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">{it.name}</p>
                        <p className="mt-0.5 text-xs text-zinc-600">
                          {it.color} • {it.size} • {it.printArea} • x{it.quantity}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-zinc-900">
                      {eur(it.price * it.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between text-zinc-700">
                  <span>Subtotal</span>
                  <span className="font-medium text-zinc-900">{eur(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-700">
                  <span>Shipping</span>
                  <span className="font-medium text-zinc-900">{eur(shipping)}</span>
                </div>

                <div className="border-t border-zinc-200 pt-4 flex items-center justify-between">
                  <span className="font-semibold text-zinc-900">Total</span>
                  <span className="font-semibold text-zinc-900">{eur(total)}</span>
                </div>
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                Taxes: later (Stripe/Printful).
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-zinc-900">Need to change something?</p>
              <p className="mt-2 text-sm text-zinc-600">
                You can still update quantities in your cart before ordering.
              </p>
              <Link
                href="/cart"
                className="mt-4 inline-flex w-full justify-center rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Back to cart
              </Link>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}