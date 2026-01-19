"use client";

import Link from "next/link";

import type { Design } from "@/lib/designs";
import type { DesignSalesStats } from "@/lib/analytics";

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

export default function CreatorDesignsSection({
  userId,
  designs,
  perDesignStats,
  busyId,
  onPublishToggle,
  onDeleteDesign,
}: {
  userId: string;
  designs: Design[];
  perDesignStats: Map<string, DesignSalesStats | undefined>;
  busyId: string | null;
  onPublishToggle: (designId: string, nextPublished: boolean) => void;
  onDeleteDesign: (designId: string) => void;
}) {
  return (
    <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-zinc-500">CREATOR</p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Mijn designs</h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">{designs.length} designs</span>
          <Link
            href="/designer"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Nieuw design
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {designs.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8">
            <p className="text-sm text-zinc-600">Nog geen designs. Maak er eentje in de designer.</p>
            <div className="mt-5">
              <Link
                href="/designer"
                className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Naar designer
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {designs.map((d) => {
              const preview = getDesignPreview(d);
              const stats = perDesignStats.get(d.id);

              const soldUnits = stats?.unitsSold ?? 0;
              const revenue = stats?.revenue ?? 0;
              const earnings = stats?.creatorEarnings ?? 0;

              const isBusy = busyId === d.id;

              return (
                <div key={d.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {d.title || "Untitled design"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {d.status === "published" ? "Published" : "Draft"} • Updated {dt(d.updatedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onPublishToggle(d.id, d.status !== "published")}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                      >
                        {d.status === "published" ? "Unpublish" : "Publish"}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          const ok = confirm("Delete this design?");
                          if (!ok) return;
                          onDeleteDesign(d.id);
                        }}
                        className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
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

                    <div className="ml-auto flex flex-col items-end gap-1">
                      <Link
                        href={`/marketplace/${encodeURIComponent(d.id)}`}
                        className="text-xs text-zinc-600 hover:text-zinc-900"
                      >
                        View →
                      </Link>

                      <Link
                        href={`/c/${encodeURIComponent(userId)}`}
                        className="text-[11px] text-zinc-500 hover:text-zinc-900"
                      >
                        Shop →
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                      <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400">SOLD</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{soldUnits}</p>
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

                  <div className="mt-4">
                    <Link
                      href={`/designer?id=${encodeURIComponent(d.id)}`}
                      className="inline-flex text-xs font-medium text-zinc-700 hover:text-zinc-900"
                    >
                      Open in designer →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}