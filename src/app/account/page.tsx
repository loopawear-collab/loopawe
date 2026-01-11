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
  type ColorOption,
} from "@/lib/designs";

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleString("nl-BE");
  } catch {
    return d;
  }
}

export default function AccountPage() {
  const { user, ready, logout } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 1) Load local data (orders + designs)
  useEffect(() => {
    if (!ready) return;
    if (!user) return;

    setOrders(listOrders());
    setDesigns(listDesignsForUser(user));
  }, [ready, user]);

  const counts = useMemo(() => {
    const drafts = designs.filter((d) => !d.published).length;
    const published = designs.filter((d) => d.published).length;
    return { drafts, published };
  }, [designs]);

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
          <div className="mt-8 flex gap-3">
            <Link
              href="/login"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Inloggen
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

  async function refreshDesigns() {
    setDesigns(listDesignsForUser(user));
  }

  async function onTogglePublish(id: string) {
    setBusyId(id);
    try {
      togglePublish(user, id);
      await refreshDesigns();
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Design verwijderen?")) return;
    setBusyId(id);
    try {
      deleteDesign(user, id);
      await refreshDesigns();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-zinc-900">Account</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Je bent ingelogd als <span className="font-medium text-zinc-900">{user.email}</span>.
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
              onClick={logout}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Order history */}
          <section className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">Order history</h2>
                <span className="text-xs text-zinc-500">{orders.length} orders</span>
              </div>

              {orders.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-600">Nog geen orders.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{o.id}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {o.createdAt ? fmtDate(String(o.createdAt)) : "—"} • {o.items?.length ?? 0} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-900">
                          {eur(Number(o.total ?? 0))}
                        </p>
                        <Link
                          href={`/success/${encodeURIComponent(o.id)}`}
                          className="mt-1 inline-block text-xs text-zinc-600 hover:text-zinc-900"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My designs */}
            <div className="mt-8 rounded-2xl border border-zinc-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">My designs</h2>
                <span className="text-xs text-zinc-500">
                  {designs.length} designs • {counts.drafts} drafts • {counts.published} published
                </span>
              </div>

              {designs.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-600">
                  Nog geen designs. Maak er eentje in de designer.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {designs.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-zinc-200 bg-white px-5 py-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            {d.title}{" "}
                            <span className="text-xs font-normal text-zinc-500">
                              • {d.productType} • {d.printArea}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Updated: {fmtDate(d.updatedAt)}
                          </p>

                          {d.prompt ? (
                            <p className="mt-2 text-sm text-zinc-700 line-clamp-2">
                              {d.prompt}
                            </p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2">
                            {(d.allowedColors ?? []).slice(0, 6).map((c: ColorOption) => (
                              <span
                                key={c.name}
                                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700"
                              >
                                <span
                                  className="h-3 w-3 rounded-full border border-zinc-200"
                                  style={{ backgroundColor: c.hex }}
                                />
                                {c.name}
                              </span>
                            ))}
                            {(d.allowedColors ?? []).length > 6 ? (
                              <span className="text-xs text-zinc-500">
                                +{(d.allowedColors ?? []).length - 6} more
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => onTogglePublish(d.id)}
                            disabled={busyId === d.id}
                            className={
                              "rounded-full px-4 py-2 text-xs font-semibold border " +
                              (d.published
                                ? "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                                : "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800") +
                              (busyId === d.id ? " opacity-60" : "")
                            }
                          >
                            {d.published ? "Unpublish" : "Publish"}
                          </button>

                          <button
                            onClick={() => onDelete(d.id)}
                            disabled={busyId === d.id}
                            className={
                              "rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" +
                              (busyId === d.id ? " opacity-60" : "")
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Side */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Next steps</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Maak een design → save draft → publish → check Marketplace.
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/designer"
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Make a design
                </Link>
                <Link
                  href="/cart"
                  className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Cart
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Status</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Designs & orders zijn nu <span className="font-medium">local-first</span>.
                Later koppelen we dit aan DB/Prisma + Printful/Stripe.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}