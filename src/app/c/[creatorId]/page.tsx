// src/app/c/[creatorId]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { listDesignsForUser, type Design } from "@/lib/designs";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

function getPreview(d: Design): string | null {
  // ✅ jouw Design type heeft previews (en géén artworkDataUrl)
  return d.previewFrontDataUrl || d.previewBackDataUrl || null;
}

export default function CreatorShopPage() {
  const params = useParams<{ creatorId: string }>();
  const creatorId = useMemo(() => decodeURIComponent(params?.creatorId ?? ""), [params]);

  const [mounted, setMounted] = useState(false);
  const [published, setPublished] = useState<Design[]>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!creatorId) return;

    const all = listDesignsForUser(creatorId);
    setPublished(all.filter((d) => d.status === "published"));
  }, [mounted, creatorId]);

  const countText = useMemo(() => {
    const n = published.length;
    return `${n} ${n === 1 ? "design" : "designs"}`;
  }, [published.length]);

  if (!mounted) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <p className="text-sm text-zinc-600">Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium tracking-widest text-zinc-500">CREATOR SHOP</p>
            <h1 className="mt-2 text-4xl font-semibold text-zinc-900">Creator</h1>
            <p className="mt-2 text-zinc-600">
              Published designs •{" "}
              <span className="font-medium text-zinc-900">{countText}</span>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                CreatorId: <span className="font-medium text-zinc-900">{creatorId}</span>
              </span>
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                Local-first demo
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/marketplace"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Marketplace
            </Link>
            <Link
              href="/cart"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Cart
            </Link>
            <Link
              href="/designer"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Create a design
            </Link>
          </div>
        </div>

        {published.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-8">
            <h2 className="text-lg font-semibold text-zinc-900">Nog geen published designs</h2>
            <p className="mt-2 text-zinc-600">
              Publish een design in de designer om het hier te tonen.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/designer"
                className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Naar designer
              </Link>
              <Link
                href="/account"
                className="inline-flex rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Naar account
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {published.map((d) => {
                const preview = getPreview(d);

                return (
                  <div key={d.id} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <Link href={`/marketplace/${encodeURIComponent(d.id)}`}>
                      <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-zinc-50 flex items-center justify-center">
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview} alt={d.title} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <p className="text-sm text-zinc-500">No preview</p>
                          </div>
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
                        <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{d.prompt || "—"}</p>
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
                        <span className="font-semibold text-zinc-900">{eur(d.basePrice ?? 0)}</span>
                      </div>

                      <Link
                        href={`/marketplace/${encodeURIComponent(d.id)}`}
                        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-10 text-xs text-zinc-500">
              Tip: later koppelen we dit aan een echte DB + usernames (slug) + profielfoto/bio.
            </p>
          </>
        )}
      </div>
    </main>
  );
}