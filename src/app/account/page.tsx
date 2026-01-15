"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listOrders, type Order } from "@/lib/cart";
import {
  listDesignsForUser,
  togglePublish,
  deleteDesign,
  type Design,
} from "@/lib/designs";

function eur(value: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(value);
}

function safeDate(dateLike: any) {
  try {
    const d = dateLike ? new Date(dateLike) : null;
    return d ? d.toLocaleString("nl-BE") : "—";
  } catch {
    return "—";
  }
}

// Design shape kan evolueren → daarom defensief
function designTitle(d: any) {
  return d?.title || d?.name || "Untitled design";
}

function designPrice(d: any) {
  // probeer meerdere mogelijke velden zonder TS errors
  const v =
    Number(d?.price) ||
    Number(d?.basePrice) ||
    Number(d?.pricing?.base) ||
    Number(d?.pricing?.price) ||
    34.99;
  return Number.isFinite(v) ? v : 34.99;
}

function designStatus(d: any): "draft" | "published" {
  return d?.status === "published" ? "published" : "draft";
}

export default function AccountPage() {
  const { user, ready, logout } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [busy, setBusy] = useState(false);

  const email = user?.email ?? "—";

  const reload = async () => {
    if (!user?.id) return;
    // cart + designs zijn local-first → client-only
    const o = (listOrders as any)() as Order[];
    const d = (listDesignsForUser as any)(user.id) as Design[];
    setOrders(Array.isArray(o) ? o : []);
    setDesigns(Array.isArray(d) ? d : []);
  };

  useEffect(() => {
    if (!ready) return;
    if (!user?.id) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id]);

  const ordersTotal = useMemo(() => orders.length, [orders]);
  const designsTotal = useMemo(() => designs.length, [designs]);

  if (!ready) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <p className="text-sm text-zinc-600">Loading…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-semibold text-zinc-900">Account</h1>
          <p className="mt-2 text-zinc-600">Je bent niet ingelogd.</p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/login"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Login
            </Link>
            <Link
              href="/"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
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
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-zinc-900">Account</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Je bent ingelogd als <span className="font-medium text-zinc-900">{email}</span>.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Orders: <span className="font-medium text-zinc-900">{ordersTotal}</span> • Designs:{" "}
              <span className="font-medium text-zinc-900">{designsTotal}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/designer"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Naar designer
            </Link>
            <Link
              href="/marketplace"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Marketplace
            </Link>
            <button
              onClick={() => logout()}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Orders */}
          <section className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">Order history</h2>
                <span className="text-xs text-zinc-500">{orders.length} orders</span>
              </div>

              <div className="mt-4 space-y-3">
                {orders.length === 0 ? (
                  <p className="text-sm text-zinc-600">Nog geen orders.</p>
                ) : (
                  orders
                    .slice()
                    .reverse()
                    .map((o) => (
                      <Link
                        key={o.id}
                        href={`/success/${encodeURIComponent(o.id)}`}
                        className="block rounded-2xl border border-zinc-200 bg-white px-5 py-4 hover:bg-zinc-50"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{o.id}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {safeDate((o as any).createdAt)} • {o.items?.length ?? 0} items
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-zinc-900">
                              {eur(Number((o as any).total) || Number((o as any).subtotal) || 0)}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">Open</p>
                          </div>
                        </div>
                      </Link>
                    ))
                )}
              </div>
            </div>

            {/* Designs */}
            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">My designs</h2>
                <span className="text-xs text-zinc-500">{designs.length} designs</span>
              </div>

              <div className="mt-4 space-y-3">
                {designs.length === 0 ? (
                  <p className="text-sm text-zinc-600">
                    Nog geen designs. Maak er eentje in de designer.
                  </p>
                ) : (
                  designs
                    .slice()
                    .reverse()
                    .map((d: any) => {
                      const status = designStatus(d);
                      return (
                        <div
                          key={d.id}
                          className="rounded-2xl border border-zinc-200 bg-white px-5 py-4"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-zinc-900">
                                {designTitle(d)}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Status:{" "}
                                <span className="font-medium text-zinc-900">{status}</span> • Price:{" "}
                                <span className="font-medium text-zinc-900">
                                  {eur(designPrice(d))}
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Updated: {safeDate(d.updatedAt ?? d.createdAt)}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {status === "published" ? (
                                <>
                                  <Link
                                    href={`/marketplace/${encodeURIComponent(d.id)}`}
                                    className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                                  >
                                    View
                                  </Link>
                                  <button
                                    disabled={busy}
                                    onClick={() => {
                                      setBusy(true);
                                      try {
                                        (togglePublish as any)(d.id, false); // ✅ correct
                                        reload();
                                      } finally {
                                        setBusy(false);
                                      }
                                    }}
                                    className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                                  >
                                    Unpublish
                                  </button>
                                </>
                              ) : (
                                <button
                                  disabled={busy}
                                  onClick={() => {
                                    setBusy(true);
                                    try {
                                      (togglePublish as any)(d.id, true); // ✅ correct
                                      reload();
                                    } finally {
                                      setBusy(false);
                                    }
                                  }}
                                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                                >
                                  Publish
                                </button>
                              )}

                              <button
                                disabled={busy}
                                onClick={() => {
                                  setBusy(true);
                                  try {
                                    (deleteDesign as any)(d.id);
                                    reload();
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                                className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {/* preview (optioneel) */}
                          {d.preview?.dataUrl || d.previewDataUrl ? (
                            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt="Design preview"
                                src={(d.preview?.dataUrl as string) || (d.previewDataUrl as string)}
                                className="h-48 w-full object-cover"
                              />
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-zinc-900">Next steps</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Publish een design → bekijk in Marketplace → voeg toe aan cart → checkout → check je
                order hier.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/designer"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  Make a design
                </Link>
                <Link
                  href="/cart"
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Cart
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-zinc-900">Status</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Auth, designs & orders zijn nu “local-first”. Later koppelen we dit aan Prisma/DB +
                Printful/Stripe.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}