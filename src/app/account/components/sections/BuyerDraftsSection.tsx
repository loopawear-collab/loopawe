"use client";

import Link from "next/link";
import type { Design } from "@/lib/designs";

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
  return d.toLocaleString("nl-BE");
}

function getDesignPreview(d: Design): string | null {
  return d.previewFrontDataUrl || d.previewBackDataUrl || null;
}

export default function BuyerDraftsSection({
  drafts,
  busyId,
  onAddToCart,
}: {
  drafts: Design[];
  busyId: string | null;
  onAddToCart: (design: Design) => void;
}) {
  return (
    <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-widest text-zinc-500">
            BUYER
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
            Mijn drafts
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Dit zijn je private designs. Ze verschijnen niet op de marketplace.
          </p>
        </div>

        <Link
          href="/designer"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Nieuw draft
        </Link>
      </div>

      {/* CONTENT */}
      <div className="mt-6">
        {drafts.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8">
            <p className="text-sm text-zinc-600">
              Nog geen drafts. Maak er eentje in de designer.
            </p>

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
            {drafts.map((d) => {
              const preview = getDesignPreview(d);
              const lockId = `draft:${d.id}`;
              const isBusy = busyId === lockId;

              return (
                <div
                  key={d.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5"
                >
                  {/* TOP */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {d.title || "Untitled design"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Draft • Updated {dt(d.updatedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/designer?id=${encodeURIComponent(d.id)}`}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                      >
                        Bewerk
                      </Link>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onAddToCart(d)}
                        className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                      >
                        {isBusy ? "Bezig…" : "Add to cart"}
                      </button>
                    </div>
                  </div>

                  {/* PREVIEW */}
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-500">
                          No preview
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-zinc-600">
                      <p>
                        {d.productType === "hoodie" ? "Hoodie" : "T-shirt"} •{" "}
                        {d.printArea === "back" ? "Back" : "Front"}
                      </p>
                      <p className="mt-1 font-semibold text-zinc-900">
                        {eur(d.basePrice)}
                      </p>
                    </div>

                    <div className="ml-auto">
                      <Link
                        href={`/designer?id=${encodeURIComponent(d.id)}`}
                        className="text-xs text-zinc-600 hover:text-zinc-900"
                      >
                        Open designer →
                      </Link>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-zinc-500">
                    Private draft (buyer). Alleen creators kunnen publishen.
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}