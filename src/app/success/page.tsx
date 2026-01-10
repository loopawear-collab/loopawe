"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

type Order = {
  orderId: string;
  createdAt: number;

  email: string;
  fullName: string;
  street: string;
  zip: string;
  city: string;
  country: string;

  items: CartItem[];
  subtotal: number;
  shipping: number;
  taxes: number;
  total: number;

  status: "PLACED";
};

const LAST_ORDER_KEY = "loopa_last_order_v1";

function money(n: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

function loadLastOrder(): Order | null {
  try {
    const raw = localStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Order;
  } catch {
    return null;
  }
}

function labelProduct(t: ProductType) {
  return t === "tshirt" ? "T-shirt" : "Hoodie";
}

function labelArea(a: PrintArea) {
  if (a === "front") return "Front";
  if (a === "back") return "Back";
  return "Front + Back";
}

export default function SuccessPage() {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    setOrder(loadLastOrder());
  }, []);

  const dateStr = useMemo(() => {
    if (!order) return "";
    const d = new Date(order.createdAt);
    return d.toLocaleString("nl-BE");
  }, [order]);

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold text-zinc-900">No order found</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Place an order first from checkout.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/designer"
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Go to designer
          </Link>
          <Link
            href="/"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">Order placed ✓</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Order <span className="font-semibold text-zinc-900">{order.orderId}</span> • {dateStr}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/designer"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Continue designing
            </Link>
            <Link
              href="/"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Home
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900">Items</h2>

            <div className="mt-4 space-y-4">
              {order.items.map((it) => (
                <div key={it.id} className="rounded-2xl border border-zinc-200 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{labelProduct(it.productType)}</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {it.colorName} • {it.size} • {labelArea(it.printArea)} • x{it.quantity}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-zinc-900">
                      {money(Math.round(it.unitPrice * it.quantity * 100) / 100)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Summary</h2>
            <div className="mt-4 rounded-2xl border border-zinc-200 p-5 text-sm">
              <div className="flex justify-between text-zinc-700">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-900">{money(order.subtotal)}</span>
              </div>
              <div className="mt-2 flex justify-between text-zinc-700">
                <span>Shipping</span>
                <span className="font-semibold text-zinc-900">{money(order.shipping)}</span>
              </div>
              <div className="mt-2 flex justify-between text-zinc-700">
                <span>Taxes</span>
                <span className="text-zinc-500">Later</span>
              </div>
              <div className="my-4 h-px bg-zinc-200" />
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-900">Total</span>
                <span className="font-semibold text-zinc-900">{money(order.total)}</span>
              </div>
            </div>

            <h2 className="mt-8 text-sm font-semibold text-zinc-900">Shipping to</h2>
            <div className="mt-4 rounded-2xl border border-zinc-200 p-5 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">{order.fullName}</p>
              <p className="mt-1">{order.street}</p>
              <p className="mt-1">
                {order.zip} {order.city}
              </p>
              <p className="mt-1">{order.country}</p>
            </div>

            <p className="mt-6 text-xs text-zinc-500">
              Next: connect Stripe payment + Printful fulfilment to make this real.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}