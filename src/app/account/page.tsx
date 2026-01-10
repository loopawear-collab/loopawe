"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";

function money(n: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

export default function AccountPage() {
  const router = useRouter();
  const { user, ready, logout } = useAuth();

  useEffect(() => {
    if (ready && !user) router.push("/login");
  }, [ready, user, router]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="text-sm text-zinc-500">Loading account…</p>
      </div>
    );
  }

  if (!user) return null;

  const orders = getOrdersForUser(user.id);

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">Account</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Logged in as <span className="font-semibold text-zinc-900">{user.email}</span>
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/designer"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold hover:bg-zinc-50"
          >
            Go to designer
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* Orders */}
        <div className="lg:col-span-2 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Order history</h2>
              <p className="mt-2 text-sm text-zinc-600">
                All orders placed while logged in will appear here.
              </p>
            </div>

            <Link
              href="/marketplace"
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Browse marketplace
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-700">
                No orders yet. Create a design and checkout to see your history here.
              </div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="rounded-2xl border border-zinc-200 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{o.id}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {new Date(o.createdAt).toLocaleString("nl-BE")} • {o.items.length} items •{" "}
                        <span className="font-semibold text-zinc-900">{money(o.total)}</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">Status: {o.status}</p>
                    </div>

                    <Link
                      href={`/success?orderId=${encodeURIComponent(o.id)}`}
                      className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Role */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Role</h2>
          <p className="mt-2 text-sm text-zinc-600">
            You are currently a{" "}
            <span className="font-semibold text-zinc-900">{user.isCreator ? "Creator" : "User"}</span>.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/designer"
              className="block rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Create a design
            </Link>
            <Link
              href="/cart"
              className="block rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Go to cart
            </Link>
          </div>

          <p className="mt-6 text-xs text-zinc-500">
            Next: creator onboarding + dashboard + payouts.
          </p>
        </div>
      </div>
    </div>
  );
}