"use client";

import Link from "next/link";

type AccountHeaderProps = {
  email: string;
  userId: string;
  isCreator: boolean;
  onLogout: () => void;
};

function ModePill({ isCreator }: { isCreator: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium " +
        (isCreator
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-zinc-50 text-zinc-700")
      }
    >
      {isCreator ? "Creator account" : "Buyer account"}
    </span>
  );
}

export default function AccountHeader({
  email,
  userId,
  isCreator,
  onLogout,
}: AccountHeaderProps) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
      {/* Left */}
      <div>
        <p className="text-xs font-medium tracking-widest text-zinc-500">ACCOUNT</p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold text-zinc-900">Account</h1>
          <ModePill isCreator={isCreator} />
        </div>

        <p className="mt-2 text-sm text-zinc-600">
          Ingelogd als <span className="font-medium text-zinc-900">{email}</span>
        </p>
      </div>

      {/* Right actions */}
      <div className="flex flex-wrap gap-3">
        {isCreator ? (
          <Link
            href={`/c/${encodeURIComponent(userId)}`}
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            My shop
          </Link>
        ) : null}

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
          onClick={onLogout}
          className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Logout
        </button>
      </div>
    </div>
  );
}