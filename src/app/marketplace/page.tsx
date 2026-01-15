// src/app/marketplace/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addToCart } from "@/lib/cart";
import { listPublishedDesigns, type Design } from "@/lib/designs";

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

export default function MarketplacePage() {
  const [mounted, setMounted] = useState(false);
  const [designs, setDesigns] = useState<Design[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // localStorage → enkel client-side
    setDesigns(listPublishedDesigns());
  }, [mounted]);

  const countText = useMemo(() => {
    if (!mounted) return "—";
    const n = designs.length;
    return `${n} ${n === 1 ? "design" : "designs"}`;
  }, [mounted, designs.length]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium tracking-widest text-zinc-500">MARKETPLACE</p>
            <h1 className="mt-2 text-4xl font-semibold text-zinc-900">Trending designs</h1>
            <p className="mt-2 text-zinc-600">
              Published designs (local-first) •{" "}
              <span className="font-medium text-zinc-900">{countText}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/designer"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Create a design
            </Link>
            <Link
              href="/cart"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Cart
            </Link>
          </div>
        </div>

        <div className="mt-10">
          {!mounted ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-600">Loading…</p>
            </div>
          ) : designs.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8">
              <h2 className="text-lg font-semibold text-zinc-900">Nog geen designs</h2>
              <p className="mt-2 text-zinc-600">
                Maak een design in de designer en klik op <span className="font-medium">Publish</span>.
              </p>
              <div className="mt-6">
                <Link
                  href="/designer"
                  className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Naar designer
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {designs.map((d) => {
                const preview =
                  d.previewFrontDataUrl || d.previewBackDataUrl || d.artworkDataUrl || undefined;

                return (
                  <div
                    key={d.id}
                    className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
                  >
                    <Link href={`/marketplace/${encodeURIComponent(d.id)}`}>
                      <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-zinc-50 flex items-center justify-center">
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={preview}
                            alt={d.title}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <p className="text-sm text-zinc-500">No preview</p>
                        )}
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-medium tracking-widest text-zinc-500">
                          {d.productType === "hoodie" ? "HOODIE" : "T-SHIRT"} •{" "}
                          {d.printArea === "back" ? "BACK" : "FRONT"}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-zinc-900">
                          {d.title || "Untitled design"}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-600 line-clamp-2">
                          {d.prompt || "—"}
                        </p>
                      </div>
                    </Link>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-zinc-700">
                        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1">
                          <span
                            className="h-3 w-3 rounded-full border border-zinc-300"
                            style={{ backgroundColor: d.selectedColor?.hex ?? "#ffffff" }}
                          />
                          {d.selectedColor?.name ?? "Color"}
                        </span>
                        <span className="font-semibold text-zinc-900">{eur(d.basePrice)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          // We houden dit compatibel met jouw cart lib.
                          addToCart({
                            name: d.productType === "hoodie" ? "Hoodie" : "T-shirt",
                            price: d.basePrice,
                            quantity: 1,
                            color: d.selectedColor?.name ?? "White",
                            size: "M",
                            printArea: d.printArea === "back" ? "Back" : "Front",
                            designId: d.id,
                            previewDataUrl: d.previewFrontDataUrl || d.previewBackDataUrl || undefined,
                          } as any);
                        }}
                        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                      >
                        Add
                      </button>
                    </div>

                    <div className="mt-4">
                      <Link
                        href={`/marketplace/${encodeURIComponent(d.id)}`}
                        className="text-sm text-zinc-600 hover:text-zinc-900"
                      >
                        View details →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-10 text-xs text-zinc-500">
          Local-first demo: designs komen uit local storage. Later koppelen we dit aan Prisma/DB + Printful.
        </p>
      </div>
    </main>
  );
}