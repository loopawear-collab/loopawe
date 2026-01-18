"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOrder,
  getCartItems,
  getCartTotals,
  subscribeCartUpdated,
  type CartItem,
  type ShippingAddress,
} from "@/lib/cart";
import { useAppToast } from "@/lib/toast";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

type FormState = ShippingAddress & { address2: string };

const EMPTY_FORM: FormState = {
  name: "",
  address1: "",
  address2: "",
  zip: "",
  city: "",
  country: "Belgium",
};

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useAppToast();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  // ✅ live cart state (not frozen)
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    // initial
    setItems(getCartItems());

    // live updates (mini-cart, cart page, marketplace…)
    const unsub = subscribeCartUpdated(() => {
      setItems(getCartItems());
    });

    return unsub;
  }, []);

  const totals = useMemo(() => getCartTotals(items), [items]);
  const canCheckout = items.length > 0;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateAddress(f: FormState) {
    if (!f.name.trim()) return "Naam is verplicht.";
    if (!f.address1.trim()) return "Adres is verplicht.";
    if (!f.zip.trim()) return "Postcode is verplicht.";
    if (!f.city.trim()) return "Stad is verplicht.";
    if (!f.country.trim()) return "Land is verplicht.";
    return null;
  }

  async function onPlaceOrder() {
    if (busy) return;

    if (!canCheckout) {
      toast.error("Je winkelmand is leeg.");
      return;
    }

    const err = validateAddress(form);
    if (err) {
      toast.error(err);
      return;
    }

    setBusy(true);
    try {
      const shippingAddress: ShippingAddress = {
        name: form.name.trim(),
        address1: form.address1.trim(),
        address2: form.address2.trim() ? form.address2.trim() : undefined,
        zip: form.zip.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
      };

      const order = createOrder({ shippingAddress });

      if (!order) {
        toast.error("Kon geen order aanmaken. (Cart leeg?)");
        return;
      }

      toast.success("Order geplaatst ✓");
      router.push(`/success/${encodeURIComponent(order.id)}`);
    } catch {
      toast.error("Er ging iets mis bij het plaatsen van je order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium tracking-widest text-zinc-500">CHECKOUT</p>
            <h1 className="mt-2 text-4xl font-semibold text-zinc-900">Verzending</h1>
            <p className="mt-2 text-zinc-600">Vul je adres in en plaats je order.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/cart"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Terug naar cart
            </Link>
            <Link
              href="/marketplace"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Verder shoppen
            </Link>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Form */}
          <section className="lg:col-span-2">
            {!canCheckout ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8">
                <h2 className="text-lg font-semibold text-zinc-900">Je winkelmand is leeg</h2>
                <p className="mt-2 text-zinc-600">
                  Voeg eerst een item toe aan je cart, daarna kan je afrekenen.
                </p>
                <div className="mt-6">
                  <Link
                    href="/marketplace"
                    className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Naar marketplace
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-zinc-900">Adresgegevens</h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-zinc-600">Naam</label>
                    <input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                      placeholder="Voornaam Achternaam"
                      autoComplete="name"
                      disabled={busy}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-zinc-600">Adres</label>
                    <input
                      value={form.address1}
                      onChange={(e) => update("address1", e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                      placeholder="Straat + nummer"
                      autoComplete="address-line1"
                      disabled={busy}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-zinc-600">Adres (extra)</label>
                    <input
                      value={form.address2}
                      onChange={(e) => update("address2", e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                      placeholder="Appartement, bus, … (optioneel)"
                      autoComplete="address-line2"
                      disabled={busy}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-600">Postcode</label>
                    <input
                      value={form.zip}
                      onChange={(e) => update("zip", e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                      placeholder="0000"
                      autoComplete="postal-code"
                      disabled={busy}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-600">Stad</label>
                    <input
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                      placeholder="Bilzen"
                      autoComplete="address-level2"
                      disabled={busy}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-zinc-600">Land</label>
                    <input
                      value={form.country}
                      onChange={(e) => update("country", e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                      placeholder="Belgium"
                      autoComplete="country-name"
                      disabled={busy}
                    />
                  </div>
                </div>
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

              <button
                type="button"
                onClick={onPlaceOrder}
                disabled={!canCheckout || busy}
                className={`mt-6 w-full rounded-full px-5 py-3 text-sm font-medium text-white ${
                  !canCheckout || busy ? "bg-zinc-300 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
                }`}
              >
                {busy ? "Order plaatsen…" : "Plaats order"}
              </button>

              <p className="mt-3 text-xs text-zinc-500">Demo checkout. Later: Stripe + echte fulfilment.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}