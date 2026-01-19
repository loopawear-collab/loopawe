"use client";

import Link from "next/link";

type BuyerStats = {
  totalOrders: number;
  totalUnits: number;
  totalSpent: number;
};

type CreatorStats = {
  totalRevenue: number;
  totalCreatorEarnings: number;
  totalOrders: number;
  totalUnits: number;
};

type DesignCounts = {
  total: number;
  published: number;
  drafts: number;
};

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export default function OverviewSection({
  isCreator,
  buyerStats,
  creatorStats,
  designCounts,
  creatorSharePercent,
  onEnableCreator,
  onDisableCreator,
}: {
  isCreator: boolean;

  buyerStats: BuyerStats;
  creatorStats: CreatorStats;
  designCounts: DesignCounts;

  creatorSharePercent: number;

  onEnableCreator: () => void;
  onDisableCreator: () => void;
}) {
  return (
    <>
      {/* MODE / CTA */}
      <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-widest text-zinc-500">
              ACCOUNT MODE
            </p>

            <h2 className="mt-2 text-xl font-semibold text-zinc-900">
              {isCreator ? "Creator dashboard (demo)" : "Buyer account (demo)"}
            </h2>

            <p className="mt-2 text-sm text-zinc-600">
              {isCreator ? (
                <>
                  Als creator kan je publishen naar de marketplace en later krijg
                  je sales, grafieken en payouts.
                </>
              ) : (
                <>
                  Als buyer kan je shoppen, bestellen en de designer gebruiken
                  voor jezelf. Publishen kan alleen als creator.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isCreator ? (
              <button
                type="button"
                onClick={onEnableCreator}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Creator worden
              </button>
            ) : (
              <button
                type="button"
                onClick={onDisableCreator}
                className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Terug naar buyer
              </button>
            )}

            <Link
              href="/designer"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Design maken
            </Link>
          </div>
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Demo: roles zitten lokaal. Later: echte onboarding + verificatie + DB.
        </p>
      </div>

      {/* STATS */}
      {isCreator ? (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            label="REVENUE"
            value={eur(creatorStats.totalRevenue)}
            sub="Gross sales"
          />

          <StatCard
            label="EARNINGS"
            value={eur(creatorStats.totalCreatorEarnings)}
            sub={`Creator share (${creatorSharePercent}%)`}
          />

          <StatCard
            label="DESIGNS"
            value={designCounts.total}
            sub={`${designCounts.published} published • ${designCounts.drafts} drafts`}
          />

          <StatCard
            label="ORDERS"
            value={creatorStats.totalOrders}
            sub={`${creatorStats.totalUnits} items sold`}
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="ORDERS"
            value={buyerStats.totalOrders}
            sub="Totaal bestellingen"
          />

          <StatCard
            label="ITEMS"
            value={buyerStats.totalUnits}
            sub="Totaal items gekocht"
          />

          <StatCard
            label="SPENT"
            value={eur(buyerStats.totalSpent)}
            sub="Demo totaal (incl. shipping)"
          />
        </div>
      )}

      <p className="mt-10 text-xs text-zinc-500">
        Demo/local-first. Later: aparte Creator Hub (grafieken, sales, payouts) +
        Marketplace search + DB.
      </p>
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}