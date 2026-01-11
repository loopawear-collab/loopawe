"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { listPublishedDesigns, type Design } from "@/lib/designs";

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

function basePriceFor(design: Design) {
  return design.productType === "hoodie" ? 49.99 : 34.99;
}

export default function MarketplacePage() {
  // Local-first: read published designs from localStorage
  const [refreshKey, setRefreshKey] = useState(0);

  const designs = useMemo(() => {
    // refreshKey forces re-read
    void refreshKey;
    return listPublishedDesigns();
  }, [refreshKey]);

  const count = designs.length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-zinc-900">Marketplace</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Published designs (local-first). <span className="font-medium text-zinc-900">{count}</span>{" "}
              {count === 1 ? "design" : "designs"}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Refresh
            </button>
            <Link
              href="/designer"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Create design
            </Link>
          </div>
        </div>

        {count === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-8">
            <p className="text-sm text-zinc-700">
              Nog niks gepubliceerd. Ga naar de designer, maak een draft en klik <b>Publish</b> in je account.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {designs.map((d) => {
              const price = basePriceFor(d); // ✅ NOOIT NaN
              return (
                <article
                  key={d.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{d.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {d.productType} • {d.printArea}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900">{eur(price)}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">base price</p>
                    </div>
                  </div>

                  {d.prompt ? (
                    <p className="mt-4 text-sm text-zinc-700 line-clamp-3">{d.prompt}</p>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-500">No prompt.</p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {(d.allowedColors ?? []).slice(0, 5).map((c) => (
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
                    {(d.allowedColors ?? []).length > 5 ? (
                      <span className="text-xs text-zinc-500">
                        +{(d.allowedColors ?? []).length - 5} more
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Link
                      href="/designer"
                      className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                    >
                      Customize
                    </Link>
                    <Link
                      href="/cart"
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                    >
                      Go to cart
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-xs text-zinc-500">
          Later: echte product pricing per design (Printful variants) + preview images + Stripe checkout.
        </p>
      </div>
    </main>
  );
}