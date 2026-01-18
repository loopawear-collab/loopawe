"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth";
import { computeOrderTotals, listOrders, type Order } from "@/lib/cart";
import { reorderToCartAndOpenMiniCart } from "@/lib/cart-actions";
import { useAppToast } from "@/lib/toast";

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

function units(items: Order["items"]) {
  return (items ?? []).reduce((sum, it) => sum + (Number.isFinite(it.quantity) ? it.quantity : 1), 0);
}

function demoStatusForOrder(o: Order) {
  const hasAddress =
    Boolean(o.shippingAddress?.name?.trim()) &&
    Boolean(o.shippingAddress?.address1?.trim()) &&
    Boolean(o.shippingAddress?.zip?.trim()) &&
    Boolean(o.shippingAddress?.city?.trim()) &&
    Boolean(o.shippingAddress?.country?.trim());

  if (!hasAddress) {
    return {
      label: "Adres ontbreekt",
      title: "Demo status: er is nog geen volledig verzendadres opgeslagen.",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    label: "In behandeling",
    title: "Demo status: order is geplaatst en wacht op betaling/fulfilment (later: Stripe + Printful).",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  };
}

export default function AccountOrdersPage() {
  const toast = useAppToast();
  const { user, ready } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  function reload() {
    setOrders(listOrders());
  }

  useEffect(() => {
    if (!mounted) return;
    reload();
  }, [mounted]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalUnits = orders.reduce((s, o) => s + units(o.items), 0);
    const totalSpent = orders.reduce((s, o) => s + computeOrderTotals(o).total, 0);
    return { totalOrders, totalUnits, totalSpent };
  }, [orders]);

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
          <h1 className="text-3xl font-semibold text-zinc-900">Mijn orders</h1>
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

  if (!mounted) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <p className="text-sm text-zinc-600">Loading…</p>
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
            <p className="text-xs font-medium tracking-widest text-zinc-500">ACCOUNT</p>
            <h1 className="mt-2 text-4xl font-semibold text-zinc-900">Mijn orders</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Ingelogd als <span className="font-medium text-zinc-900">{user.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/account"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              ← Account
            </Link>
            <Link
              href="/marketplace"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Marketplace
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">ORDERS</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{stats.totalOrders}</p>
            <p className="mt-1 text-xs text-zinc-500">Totaal aantal bestellingen</p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">ITEMS</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{stats.totalUnits}</p>
            <p className="mt-1 text-xs text-zinc-500">Totaal items gekocht</p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">TOTAAL</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{eur(stats.totalSpent)}</p>
            <p className="mt-1 text-xs text-zinc-500">Demo totaal (incl. shipping)</p>
          </div>
        </div>

        {/* Orders list */}
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-zinc-900">Ordergeschiedenis</h2>

            <button
              type="button"
              onClick={reload}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4">
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8">
                <h3 className="text-lg font-semibold text-zinc-900">Nog geen orders</h3>
                <p className="mt-2 text-zinc-600">Ga naar de marketplace en probeer een demo-checkout.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/marketplace"
                    className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Naar marketplace
                  </Link>
                  <Link
                    href="/designer"
                    className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Naar designer
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => {
                  const t = computeOrderTotals(o);
                  const itemCount = units(o.items);
                  const status = demoStatusForOrder(o);
                  const isBusy = busyOrderId === o.id;

                  return (
                    <div key={o.id} className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-zinc-900">{o.id}</p>
                            <span
                              title={status.title}
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-zinc-500">
                            {dt(o.createdAt)} • {itemCount} {itemCount === 1 ? "item" : "items"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
                          <div className="text-right">
                            <p className="text-xs text-zinc-500">Totaal</p>
                            <p className="text-sm font-semibold text-zinc-900">{eur(t.total)}</p>
                          </div>

                          <Link
                            href={`/account/orders/${encodeURIComponent(o.id)}`}
                            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                          >
                            Details →
                          </Link>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (isBusy) return;

                              const items = Array.isArray(o.items) ? o.items : [];
                              if (items.length === 0) {
                                toast.error("Deze order heeft geen items.");
                                return;
                              }

                              setBusyOrderId(o.id);
                              try {
                                const res = reorderToCartAndOpenMiniCart({ items });
                                const added = res.addedCount;

                                toast.success(
                                  added > 0 ? `Opnieuw toegevoegd: ${added} item(s) ✓` : "Winkelmandje geopend ✓"
                                );
                              } catch {
                                toast.error("Kon items niet opnieuw toevoegen");
                              } finally {
                                setBusyOrderId(null);
                              }
                            }}
                            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                          >
                            {isBusy ? "Bezig…" : "Opnieuw bestellen"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-6 text-xs text-zinc-500">
            Demo: orders zitten in localStorage. Later: echte order status + DB + Stripe webhooks.
          </p>
        </div>
      </div>
    </main>
  );
}