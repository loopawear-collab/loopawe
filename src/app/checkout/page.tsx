"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { saveOrder, type Order } from "@/lib/orders";

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

function uid() {
  return "LW-" + Math.random().toString(16).slice(2).toUpperCase() + "-" + Date.now().toString(36).toUpperCase();
}

function labelProduct(t: ProductType) {
  return t === "tshirt" ? "T-shirt" : "Hoodie";
}

function labelArea(a: PrintArea) {
  if (a === "front") return "Front";
  if (a === "back") return "Back";
  return "Front + Back";
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, ready } = useAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  // Customer form
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Belgium");

  useEffect(() => {
    setItems(loadCart());
  }, []);

  // Autofill email if logged in
  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const subtotal = useMemo(() => {
    const s = items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
    return Math.round(s * 100) / 100;
  }, [items]);

  const shippingCost = useMemo(() => (items.length > 0 ? 6.95 : 0), [items.length]);
  const taxes = useMemo(() => 0, []);
  const total = useMemo(
    () => Math.round((subtotal + shippingCost + taxes) * 100) / 100,
    [subtotal, shippingCost, taxes]
  );

  const formOk =
    email.trim().length > 3 &&
    fullName.trim().length > 2 &&
    street.trim().length > 4 &&
    zip.trim().length > 2 &&
    city.trim().length > 2 &&
    country.trim().length > 1;

  async function placeOrderSimulated() {
    if (items.length === 0) {
      setToast("Your cart is empty");
      window.setTimeout(() => setToast(null), 1400);
      return;
    }
    if (!formOk) {
      setToast("Fill in your details first");
      window.setTimeout(() => setToast(null), 1400);
      return;
    }
    if (!ready) return;

    // Require login for order history (pro behaviour)
    if (!user) {
      setToast("Please login to place an order");
      window.setTimeout(() => setToast(null), 1400);
      router.push("/login");
      return;
    }

    setPlacing(true);

    const order: Order = {
      id: uid(),
      createdAt: Date.now(),
      userId: user.id,
      email: email.trim(),
      shipping: {
        fullName: fullName.trim(),
        street: street.trim(),
        zip: zip.trim(),
        city: city.trim(),
        country: country.trim(),
      },
      items,
      subtotal,
      shippingCost,
      taxes,
      total,
      status: "PLACED",
    };

    // Save order to history + also keep last order
    saveOrder(order);

    // Clear cart
    saveCart([]);
    setItems([]);

    setToast("Order placed ✓");
    window.setTimeout(() => {
      setToast(null);
      router.push(`/success?orderId=${encodeURIComponent(order.id)}`);
    }, 500);

    setPlacing(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">Checkout</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Premium checkout flow. Payments (Stripe) + fulfilment (Printful) will be connected next.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Back to cart
          </Link>
          <Link
            href="/designer"
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Continue designing
          </Link>
        </div>
      </div>

      {toast && (
        <div className="mt-6 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white">
          {toast}
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Your cart is empty</h2>
              <p className="mt-2 text-sm text-zinc-600">Add something in the designer first.</p>
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
            <>
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-900">Contact</h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-600">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-600">Full name</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Mattias Wevers"
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-900">Shipping address</h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-600">Street + number</label>
                    <input
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Main Street 12"
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-600">ZIP</label>
                    <input
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="3740"
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-600">City</label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Bilzen"
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-600">Country</label>
                    <input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT */}
        <div className="lg:sticky lg:top-24">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Order summary</h2>

            <div className="mt-5 space-y-3 text-sm">
              {items.length > 0 && (
                <div className="space-y-3">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {labelProduct(it.productType)}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-600">
                          {it.colorName} • {it.size} • {labelArea(it.printArea)} • x{it.quantity}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-zinc-900">
                        {money(Math.round(it.unitPrice * it.quantity * 100) / 100)}
                      </div>
                    </div>
                  ))}
                  <div className="h-px bg-zinc-200" />
                </div>
              )}

              <div className="flex items-center justify-between text-zinc-700">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-900">{money(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-zinc-700">
                <span>Shipping</span>
                <span className="font-semibold text-zinc-900">{money(shippingCost)}</span>
              </div>

              <div className="flex items-center justify-between text-zinc-700">
                <span>Taxes</span>
                <span className="text-zinc-500">Calculated later</span>
              </div>

              <div className="mt-4 h-px bg-zinc-200" />

              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">Total</span>
                <span className="font-semibold text-zinc-900">{money(total)}</span>
              </div>

              <button
                onClick={placeOrderSimulated}
                disabled={items.length === 0 || !formOk || placing}
                className="mt-4 w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {placing ? "Placing order..." : "Place order"}
              </button>

              {!user && ready && items.length > 0 && (
                <p className="mt-2 text-xs text-zinc-500">
                  You need to login to save orders in your account.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}