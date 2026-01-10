"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function AccountPage() {
  const router = useRouter();
  const { user, ready, logout } = useAuth();

  // Redirect ONLY after auth is ready
  useEffect(() => {
    if (ready && !user) {
      router.push("/login");
    }
  }, [ready, user, router]);

  // While loading auth state
  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="text-sm text-zinc-500">Loading account…</p>
      </div>
    );
  }

  if (!user) return null;

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
            Logged in as{" "}
            <span className="font-semibold text-zinc-900">
              {user.email}
            </span>
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
        <div className="lg:col-span-2 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Overview</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Orders, saved designs and creator earnings will appear here.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 p-5">
              <p className="text-xs text-zinc-500">Orders</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">—</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-5">
              <p className="text-xs text-zinc-500">Designs</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">—</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Role</h2>
          <p className="mt-2 text-sm text-zinc-600">
            You are currently a{" "}
            <span className="font-semibold text-zinc-900">
              {user.isCreator ? "Creator" : "User"}
            </span>
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/marketplace"
              className="block rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Browse marketplace
            </Link>
            <Link
              href="/designer"
              className="block rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Create a design
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}