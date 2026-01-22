"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOrder,
  getCartItems,
  getCartTotals,
  subscribeCartUpdated,
  type CartItem,
  type ShippingAddress,
} from "@/lib/cart";
import { processPayment } from "@/lib/payments";
import { useAppToast } from "@/lib/toast";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

type FormState = ShippingAddress & { address2: string };
type FieldKey = "name" | "address1" | "zip" | "city" | "country";

const EMPTY_FORM: FormState = {
  name: "",
  address1: "",
  address2: "",
  zip: "",
  city: "",
  country: "Belgium",
};

function itemTitle(it: CartItem) {
  if (it.productType === "hoodie") return "Hoodie";
  if (it.productType === "tshirt") return "T-shirt";
  return it.name || "Item";
}

function firstErrorField(f: FormState): FieldKey | null {
  if (!f.name.trim()) return "name";
  if (!f.address1.trim()) return "address1";
  if (!f.zip.trim()) return "zip";
  if (!f.city.trim()) return "city";
  if (!f.country.trim()) return "country";
  return null;
}

function errorMessageForField(field: FieldKey): string {
  switch (field) {
    case "name":
      return "Naam is verplicht.";
    case "address1":
      return "Adres is verplicht.";
    case "zip":
      return "Postcode is verplicht.";
    case "city":
      return "Stad is verplicht.";
    case "country":
      return "Land is verplicht.";
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useAppToast();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  // field-level errors
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [firstErr, setFirstErr] = useState<FieldKey | null>(null);

  // refs for scroll/focus
  const nameRef = useRef<HTMLInputElement | null>(null);
  const address1Ref = useRef<HTMLInputElement | null>(null);
  const zipRef = useRef<HTMLInputElement | null>(null);
  const cityRef = useRef<HTMLInputElement | null>(null);
  const countryRef = useRef<HTMLInputElement | null>(null);

  function refFor(field: FieldKey) {
    if (field === "name") return nameRef;
    if (field === "address1") return address1Ref;
    if (field === "zip") return zipRef;
    if (field === "city") return cityRef;
    return countryRef;
  }

  // live cart state
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCartItems());

    const unsub = subscribeCartUpdated(() => {
      setItems(getCartItems());
    });

    return unsub;
  }, []);

  const totals = useMemo(() => getCartTotals(items), [items]);
  const canCheckout = items.length > 0;

  const itemCount = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number.isFinite(it.quantity) ? it.quantity : 1), 0);
  }, [items]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));

    // if user edits after error, re-check first error live
    if (firstErr) {
      const next = { ...form, [key]: value } as FormState;
      setFirstErr(firstErrorField(next));
    }
  }

  function markTouched(field: FieldKey) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function fieldHasError(field: FieldKey) {
    const needs = touched[field] || firstErr === field;
    if (!needs) return false;

    const v = (form as any)[field];
    return typeof v === "string" ? !v.trim() : true;
  }

  function fieldClass(field: FieldKey) {
    const base =
      "mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10";
    const ok = "border-zinc-200";
    const bad = "border-red-300 focus:ring-red-500/15";
    return `${base} ${fieldHasError(field) ? bad : ok}`;
  }

  function validateAndGuide(): FieldKey | null {
    const errField = firstErrorField(form);
    setFirstErr(errField);

    if (errField) {
      setTouched((prev) => ({ ...prev, [errField]: true }));
      toast.error(errorMessageForField(errField));

      const r = refFor(errField);
      window.setTimeout(() => {
        r.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        r.current?.focus();
      }, 50);

      return errField;
    }

    return null;
  }

  async function onPlaceOrder() {
    if (busy) return;

    if (!canCheckout) {
      toast.error("Je winkelmand is leeg.");
      return;
    }

    const errField = validateAndGuide();
    if (errField) return;

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

      // ✅ createOrder maakt nu een order met status "pending" (Stripe-ready)
      const order = createOrder({ shippingAddress });

      if (!order) {
        toast.error("Kon geen order aanmaken. (Cart leeg?)");
        return;
      }

      toast.success("Order aangemaakt ✓ (pending)");
      router.push(`/success/${encodeURIComponent(order.id)}`);
    } catch {
      toast.error("Er ging iets mis bij het plaatsen van je order.");
    } finally {
      setBusy(false);
    }
  }

  async function onMockPayment() {
    if (busy) return;

    if (!canCheckout) {
      toast.error("Je winkelmand is leeg.");
      return;
    }

    const errField = validateAndGuide();
    if (errField) return;

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

      // Step 1: Create order (status: pending)
      const order = createOrder({ shippingAddress });

      if (!order) {
        toast.error("Kon geen order aanmaken. (Cart leeg?)");
        return;
      }

      // Step 2: Process payment using mock provider
      // Status transition: pending → paid_mock
      const result = await processPayment(order.id, "mock");

      if (!result.success || !result.order) {
        toast.error(result.error || "Kon order niet markeren als betaald.");
        return;
      }

      toast.success("Test betaling voltooid ✓");
      router.push(`/success/${encodeURIComponent(order.id)}`);
    } catch {
      toast.error("Er ging iets mis bij de test betaling.");
    } finally {
      setBusy(false);
    }
  }

  function onEnterSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    if (busy) return;
    e.preventDefault();
    onPlaceOrder();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="relative rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        {/* Overlay */}
        {busy ? (
          <div className="absolute inset-0 z-20 rounded-3xl bg-white/70 backdrop-blur-sm">
            <div className="flex h-full w-full items-center justify-center">
              <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
                <p className="text-sm font-medium text-zinc-900">Order plaatsen…</p>
                <p className="mt-1 text-xs text-zinc-500">Even geduld, we verwerken je checkout.</p>
              </div>
            </div>
          </div>
        ) : null}

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
                <p className="mt-2 text-zinc-600">Voeg eerst een item toe aan je cart, daarna kan je afrekenen.</p>
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
              <div className="space-y-6">
                {/* Order summary */}
                <div className="rounded-3xl border border-zinc-200 bg-white p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="text-xs font-medium tracking-widest text-zinc-500">ORDER SUMMARY</p>
                      <p className="mt-2 text-sm text-zinc-600">
                        <span className="font-medium text-zinc-900">{itemCount}</span>{" "}
                        {itemCount === 1 ? "item" : "items"} •{" "}
                        <span className="font-medium text-zinc-900">{eur(totals.total)}</span>
                      </p>
                    </div>

                    <Link
                      href="/cart"
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                    >
                      Wijzig cart →
                    </Link>
                  </div>

                  <div className="mt-4 space-y-3">
                    {items.slice(0, 4).map((it) => {
                      const qty = it.quantity ?? 1;
                      return (
                        <div key={it.id} className="flex items-center justify-between gap-4 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-900">
                              {itemTitle(it)} <span className="text-zinc-500">×{qty}</span>
                            </p>
                            <p className="mt-1 truncate text-xs text-zinc-600">
                              {it.color} • {it.size} • {it.printArea}
                            </p>
                          </div>
                          <div className="shrink-0 font-medium text-zinc-900">{eur((it.price || 0) * qty)}</div>
                        </div>
                      );
                    })}

                    {items.length > 4 ? (
                      <p className="text-xs text-zinc-500">+ {items.length - 4} meer item(s) in je order</p>
                    ) : null}
                  </div>
                </div>

                {/* Address form */}
                <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-900">Adresgegevens</h2>
                    <p className="text-xs text-zinc-500">Tip: druk Enter om te bevestigen</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-zinc-600">Naam</label>
                      <input
                        ref={nameRef}
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        onBlur={() => markTouched("name")}
                        onKeyDown={onEnterSubmit}
                        className={fieldClass("name")}
                        placeholder="Voornaam Achternaam"
                        autoComplete="name"
                        disabled={busy}
                      />
                      {fieldHasError("name") ? <p className="mt-2 text-xs text-red-600">Vul je naam in.</p> : null}
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-zinc-600">Adres</label>
                      <input
                        ref={address1Ref}
                        value={form.address1}
                        onChange={(e) => update("address1", e.target.value)}
                        onBlur={() => markTouched("address1")}
                        onKeyDown={onEnterSubmit}
                        className={fieldClass("address1")}
                        placeholder="Straat + nummer"
                        autoComplete="address-line1"
                        disabled={busy}
                      />
                      {fieldHasError("address1") ? <p className="mt-2 text-xs text-red-600">Vul je adres in.</p> : null}
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-zinc-600">Adres (extra)</label>
                      <input
                        value={form.address2}
                        onChange={(e) => update("address2", e.target.value)}
                        onKeyDown={onEnterSubmit}
                        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                        placeholder="Appartement, bus, … (optioneel)"
                        autoComplete="address-line2"
                        disabled={busy}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-600">Postcode</label>
                      <input
                        ref={zipRef}
                        value={form.zip}
                        onChange={(e) => update("zip", e.target.value)}
                        onBlur={() => markTouched("zip")}
                        onKeyDown={onEnterSubmit}
                        className={fieldClass("zip")}
                        placeholder="0000"
                        autoComplete="postal-code"
                        disabled={busy}
                      />
                      {fieldHasError("zip") ? <p className="mt-2 text-xs text-red-600">Vul je postcode in.</p> : null}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-600">Stad</label>
                      <input
                        ref={cityRef}
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        onBlur={() => markTouched("city")}
                        onKeyDown={onEnterSubmit}
                        className={fieldClass("city")}
                        placeholder="Bilzen"
                        autoComplete="address-level2"
                        disabled={busy}
                      />
                      {fieldHasError("city") ? <p className="mt-2 text-xs text-red-600">Vul je stad in.</p> : null}
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-zinc-600">Land</label>
                      <input
                        ref={countryRef}
                        value={form.country}
                        onChange={(e) => update("country", e.target.value)}
                        onBlur={() => markTouched("country")}
                        onKeyDown={onEnterSubmit}
                        className={fieldClass("country")}
                        placeholder="Belgium"
                        autoComplete="country-name"
                        disabled={busy}
                      />
                      {fieldHasError("country") ? <p className="mt-2 text-xs text-red-600">Vul je land in.</p> : null}
                    </div>
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
                className={`w-full rounded-full px-5 py-3 text-sm font-medium text-white ${
                  !canCheckout || busy ? "bg-zinc-300 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
                }`}
              >
                {busy ? "Order plaatsen…" : "Plaats order"}
              </button>

              <div className="mt-3 border-t border-zinc-200 pt-3">
                <button
                  type="button"
                  onClick={onMockPayment}
                  disabled={!canCheckout || busy}
                  className={`w-full rounded-full border-2 border-zinc-300 px-5 py-3 text-sm font-medium ${
                    !canCheckout || busy
                      ? "border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed"
                      : "bg-white text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400"
                  }`}
                >
                  {busy ? "Bezig…" : "Test payment (no charge)"}
                </button>
                <p className="mt-2 text-xs text-zinc-500">
                  Demo checkout. Later: Stripe + echte fulfilment.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}