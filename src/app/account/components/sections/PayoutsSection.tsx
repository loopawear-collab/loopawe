"use client";

import Link from "next/link";
import type { CreatorPayout } from "@/lib/payouts";
import { getDesignById } from "@/lib/designs";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function dt(v?: string | number | Date) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("nl-BE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: CreatorPayout["status"] }) {
  const styles =
    status === "eligible"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "paid"
        ? "border-zinc-200 bg-zinc-50 text-zinc-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${styles}`}>
      {status === "eligible" ? "Eligible" : status === "paid" ? "Paid" : "Pending"}
    </span>
  );
}

export default function PayoutsSection({
  payouts,
}: {
  payouts: CreatorPayout[];
}) {
  // Sort by created date (newest first)
  const sorted = [...payouts].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });

  return (
    <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-zinc-500">PAYOUTS</p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Mijn payouts</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Overzicht van alle payouts voor je verkochte designs.
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mt-6">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8">
            <p className="text-sm text-zinc-600">Nog geen payouts.</p>
            <p className="mt-2 text-sm text-zinc-600">
              Payouts worden automatisch aangemaakt wanneer orders worden betaald.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((payout) => {
              const design = getDesignById(payout.designId);
              const designName = design?.title || "Unknown design";

              return (
                <div
                  key={payout.id}
                  className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={payout.status} />

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900">{eur(payout.amount)}</p>
                        <p className="mt-1 text-xs text-zinc-600">
                          Order: <span className="font-mono text-zinc-500">{payout.orderId}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                      <span>
                        Design:{" "}
                        <Link
                          href={`/marketplace/${encodeURIComponent(payout.designId)}`}
                          className="font-medium text-zinc-700 hover:text-zinc-900"
                        >
                          {designName}
                        </Link>
                      </span>
                      <span>•</span>
                      <span>Created: {dt(payout.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/account/orders/${encodeURIComponent(payout.orderId)}`}
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                    >
                      View order →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        Eligible payouts will be processed once payout functionality is enabled.
      </p>
    </div>
  );
}
