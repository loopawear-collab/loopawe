"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getOrderById, type Order } from "@/lib/cart";

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

export default function SuccessPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId ? String(params.orderId) : "";

  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    setOrder(getOrderById(orderId));
  }, [orderId]);

  const createdAtText = useMemo(() => {
    if (!order) return "";
    return new Date(order.createdAt).toLocaleString("nl-BE");
  }, [order]);

  if (!orderId) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-semibold text-zinc-900">Missing orderId</h1>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            Home
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-semibold text-zinc-900">Order not found</h1>
          <p className="mt-2 text-zinc-600">
            This can happen if you opened the link in another browser or storage is cleared.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/cart" className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50">
              Back to cart
            </Link>
            <Link href="/" className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800">
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-zinc-900">
              Order placed <span className="align-middle">✓</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Order <span className="font-semibold text-zinc-900">{order.id}</span> • {createdAtText}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/account" className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800">
              View account
            </Link>
            <Link href="/designer" className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50">
              New design
            </Link>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900">Items</h2>
            <div className="mt-4 space-y-4">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-6 py-5">
                  <div>
                    <p className="font-medium text-zinc-900">{it.name}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {it.color} • {it.size} • {it.printArea} • x{it.quantity}
                    </p>
                  </div>
                  <p className="font-medium text-zinc-900">{eur(it.price * it.quantity)}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Summary</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-700">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-900">{eur(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>Shipping</span>
                  <span className="font-semibold text-zinc-900">{eur(order.shipping)}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-zinc-200 pt-3">
                  <span className="font-semibold text-zinc-900">Total</span>
                  <span className="font-semibold text-zinc-900">{eur(order.total)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Shipping to</h2>
              <div className="mt-4 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.address1}</p>
                {order.shippingAddress.address2 ? <p>{order.shippingAddress.address2}</p> : null}
                <p>
                  {order.shippingAddress.zip} {order.shippingAddress.city}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}