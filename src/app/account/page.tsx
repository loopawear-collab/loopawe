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
import {
  computeDesignStats,
  computeOverallStats,
  DEFAULT_CREATOR_SHARE,
  type DesignSalesStats,
} from "@/lib/analytics";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

function dt(v?: string | number | Date) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("nl-BE");
}

function getDesignPreview(d: Design): string | null {
  return d.previewFrontDataUrl || d.previewBackDataUrl || null;
}

export default function AccountPage() {
  const { user, ready, logout } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Later: instelbaar per creator
  const creatorShare = DEFAULT_CREATOR_SHARE;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    setOrders(listOrders());
    if (user?.id) setDesigns(listDesignsForUser(user.id));
    else setDesigns([]);
  }, [mounted, user?.id]);

  const perDesignStats = useMemo(() => computeDesignStats(orders, creatorShare), [orders, creatorShare]);
  const overall = useMemo(() => computeOverallStats(orders, creatorShare), [orders, creatorShare]);

  const orderCount = orders.length;
  const designCount = designs.length;

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

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Register
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
              Ingelogd als <span className="font-medium text-zinc-900">{user.email}</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {mounted ? `${orderCount} orders • ${designCount} designs` : "—"}
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
              type="button"
              onClick={logout}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Futuristic stat cards */}
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">REVENUE</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{mounted ? eur(overall.totalRevenue) : "—"}</p>
            <p className="mt-1 text-xs text-zinc-500">Gross sales</p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">EARNINGS</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{mounted ? eur(overall.totalCreatorEarnings) : "—"}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Creator share ({Math.round(creatorShare * 100)}%)
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">PLATFORM</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{mounted ? eur(overall.totalLoopaCut) : "—"}</p>
            <p className="mt-1 text-xs text-zinc-500">Loopa cut (demo)</p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">ORDERS</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{mounted ? overall.totalOrders : "—"}</p>
            <p className="mt-1 text-xs text-zinc-500">{mounted ? `${overall.totalUnits} items sold` : "—"}</p>
          </div>
        </div>

        {/* Orders + sidebar */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Orders */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Order history</h2>
              <p className="text-xs text-zinc-500">{mounted ? `${orderCount} orders` : "—"}</p>
            </div>

            <div className="mt-4 space-y-3">
              {!mounted ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <p className="text-sm text-zinc-600">Loading…</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-8">
                  <p className="text-zinc-600">Nog geen orders. Test checkout om er één te maken.</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/marketplace"
                      className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      Naar marketplace
                    </Link>
                    <Link
                      href="/cart"
                      className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                    >
                      Naar cart
                    </Link>
                  </div>
                </div>
              ) : (
                orders.map((o) => {
                  const itemsCount = o.items?.reduce((s, it) => s + (it.quantity ?? 0), 0) ?? 0;

                  const total =
                    typeof o.total === "number" && !Number.isNaN(o.total)
                      ? o.total
                      : (typeof o.subtotal === "number" ? o.subtotal : 0) +
                        (typeof o.shipping === "number" ? o.shipping : 0);

                  return (
                    <Link
                      key={o.id}
                      href={`/success/${encodeURIComponent(o.id)}`}
                      className="block rounded-2xl border border-zinc-200 bg-white px-6 py-5 hover:bg-zinc-50"
                    >
                      <div className="flex items-center justify-between gap-6">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{o.id}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {dt(o.createdAt)} • {itemsCount} item{itemsCount === 1 ? "" : "s"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold text-zinc-900">{eur(total)}</p>
                          <p className="mt-1 text-xs text-zinc-500">Open</p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Creator split</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Demo: <span className="font-semibold">{Math.round(creatorShare * 100)}%</span> creator •{" "}
                <span className="font-semibold">{Math.round((1 - creatorShare) * 100)}%</span> Loopa
              </p>
              <p className="mt-3 text-xs text-zinc-500">
                Later: instelbaar per creator + minimum pricing + coupons.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Next steps</h2>
              <p className="mt-2 text-sm text-zinc-600">Publish → verkoop → stats verschijnen automatisch.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/designer"
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Make a design
                </Link>
                <Link
                  href="/marketplace"
                  className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Marketplace
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* My designs */}
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">My designs</h2>
            <p className="text-xs text-zinc-500">{mounted ? `${designCount} designs` : "—"}</p>
          </div>

          <div className="mt-4">
            {!mounted ? (
              <p className="text-sm text-zinc-600">Loading…</p>
            ) : designs.length === 0 ? (
              <p className="text-sm text-zinc-600">Nog geen designs. Maak er eentje in de designer.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {designs.map((d) => {
                  const preview = getDesignPreview(d);
                  const stats: DesignSalesStats | undefined = perDesignStats.get(d.id);

                  const units = stats?.unitsSold ?? 0;
                  const revenue = stats?.revenue ?? 0;
                  const earnings = stats?.creatorEarnings ?? 0;

                  return (
                    <div key={d.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900">{d.title || "Untitled design"}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {d.status === "published" ? "Published" : "Draft"} • Updated {dt(d.updatedAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busyId === d.id}
                            onClick={() => {
                              setBusyId(d.id);
                              togglePublish(d.id, d.status !== "published");
                              setDesigns(listDesignsForUser(user.id));
                              setBusyId(null);
                            }}
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                          >
                            {d.status === "published" ? "Unpublish" : "Publish"}
                          </button>

                          <button
                            type="button"
                            disabled={busyId === d.id}
                            onClick={() => {
                              setBusyId(d.id);
                              deleteDesign(d.id);
                              setDesigns(listDesignsForUser(user.id));
                              setBusyId(null);
                            }}
                            className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-4">
                        <div className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                          {preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={preview} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-zinc-500">No preview</span>
                          )}
                        </div>

                        <div className="text-xs text-zinc-600">
                          <p>
                            {d.productType === "hoodie" ? "Hoodie" : "T-shirt"} •{" "}
                            {d.printArea === "back" ? "Back" : "Front"}
                          </p>
                          <p className="mt-1 font-semibold text-zinc-900">{eur(d.basePrice)}</p>
                        </div>

                        <div className="ml-auto">
                          <Link
                            href={`/marketplace/${encodeURIComponent(d.id)}`}
                            className="text-xs text-zinc-600 hover:text-zinc-900"
                          >
                            View →
                          </Link>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                          <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400">SOLD</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{units}</p>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                          <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400">REVENUE</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{eur(revenue)}</p>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                          <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400">EARNINGS</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900">{eur(earnings)}</p>
                        </div>
                      </div>

                      {stats?.lastSaleAt ? (
                        <p className="mt-3 text-[11px] text-zinc-500">Last sale: {dt(stats.lastSaleAt)}</p>
                      ) : (
                        <p className="mt-3 text-[11px] text-zinc-500">No sales yet.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-zinc-500">
          Stats are computed locally from orders. Later: DB-backed analytics + real payouts.
        </p>
      </div>
    </main>
  );
}