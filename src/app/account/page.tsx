"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { listOrders, type Order } from "@/lib/cart";

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

function formatDate(ts: string) {
  try {
    return new Date(ts).toLocaleString("nl-BE");
  } catch {
    return ts;
  }
}

function badge(status: string) {
  // local demo statuses (later: Printful/Stripe statuses)
  const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border";
  if (status === "PLACED") return `${base} border-zinc-200 bg-zinc-50 text-zinc-800`;
  if (status === "PROCESSING") return `${base} border-amber-200 bg-amber-50 text-amber-800`;
  if (status === "SHIPPED") return `${base} border-blue-200 bg-blue-50 text-blue-800`;
  if (status === "DELIVERED") return `${base} border-emerald-200 bg-emerald-50 text-emerald-800`;
  return `${base} border-zinc-200 bg-white text-zinc-700`;
}

export default function AccountPage() {
  const router = useRouter();
  const { user, ready, logout } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Redirect if not logged in (after ready)
  useEffect(() => {
    if (ready && !user) router.push("/login");
  }, [ready, user, router]);

  // Load orders (from localStorage)
  useEffect(() => {
    if (!ready || !user) return;
    setOrders(listOrders());
  }, [ready, user]);

  const filtered = useMemo(() => {
    if (!q.trim()) return orders;
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => o.id.toLowerCase().includes(needle) || o.shippingAddress.name.toLowerCase().includes(needle));
  }, [orders, q]);

  const stats = useMemo(() => {
    const count = orders.length;
    const totalSpent = orders.reduce((s, o) => s + (Number.isFinite(o.total) ? o.total : 0), 0);
    return { count, totalSpent };
  }, [orders]);

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="text-sm text-zinc-500">Loading account…</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-zinc-900">Account</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Logged in as <span className="font-semibold text-zinc-900">{user.email}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/designer"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Designer
          </Link>
          <Link
            href="/marketplace"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Marketplace
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Logout
          </button>
        </div>
      </div>

      {toast && (
        <div className="mt-6 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white">
          {toast}
        </div>
      )}

      {/* Top cards */}
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-zinc-500">Orders</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{stats.count}</p>
          <p className="mt-1 text-xs text-zinc-500">All time</p>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-zinc-500">Total spent</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{eur(stats.totalSpent)}</p>
          <p className="mt-1 text-xs text-zinc-500">Demo totals (Stripe later)</p>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-zinc-500">Role</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{user.isCreator ? "Creator" : "User"}</p>
          <p className="mt-1 text-xs text-zinc-500">Creator dashboard next</p>
        </div>
      </div>

      {/* Orders list */}
      <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Order history</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Click an order to view details (opens your success page).
            </p>
          </div>

          <div className="flex w-full items-center gap-3 md:w-auto">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by order id or name…"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 md:w-[320px]"
            />
            <button
              onClick={() => setQ("")}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
              <p className="text-sm text-zinc-700">No orders found.</p>
              <p className="mt-2 text-xs text-zinc-500">
                Place an order via Cart → Checkout to see it here.
              </p>
              <div className="mt-4">
                <Link
                  href="/designer"
                  className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Go to designer
                </Link>
              </div>
            </div>
          ) : (
            filtered.map((o) => (
              <div key={o.id} className="rounded-2xl border border-zinc-200 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-900">{o.id}</p>
                      <span className={badge((o as any).status ?? "PLACED")}>{(o as any).status ?? "PLACED"}</span>
                    </div>

                    <p className="mt-1 text-sm text-zinc-600">
                      {formatDate(o.createdAt)} •{" "}
                      <span className="font-semibold text-zinc-900">{eur(o.total)}</span> •{" "}
                      {o.items.length} item(s)
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Ship to: {o.shippingAddress.name} — {o.shippingAddress.city}, {o.shippingAddress.country}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/success/${encodeURIComponent(o.id)}`}
                      className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                    >
                      View
                    </Link>

                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(o.id);
                        setToast("Order id copied ✓");
                        window.setTimeout(() => setToast(null), 1200);
                      }}
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                    >
                      Copy id
                    </button>
                  </div>
                </div>

                {/* Mini items preview */}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {o.items.slice(0, 2).map((it) => (
                    <div key={it.id} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-900">{it.name}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {it.color} • {it.size} • {it.printArea} • x{it.quantity}
                      </p>
                    </div>
                  ))}
                </div>

                {o.items.length > 2 && (
                  <p className="mt-3 text-xs text-zinc-500">
                    +{o.items.length - 2} more item(s)
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-8 text-xs text-zinc-500">
        Next upgrades: creator onboarding + publish designs to marketplace + Stripe payments + Printful fulfilment.
      </p>
    </main>
  );
}