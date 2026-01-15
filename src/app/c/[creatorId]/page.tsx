// src/app/c/[creatorId]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { listDesignsForUser, type Design } from "@/lib/designs";
import { getCreatorProfile } from "@/lib/creator-profile";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  const a = parts[0]?.[0] ?? "C";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

function getPreview(d: Design): string | null {
  return d.previewFrontDataUrl || d.previewBackDataUrl || null;
}

export default function CreatorShopPage() {
  const params = useParams<{ creatorId: string }>();
  const creatorId = useMemo(() => decodeURIComponent(params?.creatorId ?? ""), [params]);

  const [mounted, setMounted] = useState(false);
  const [published, setPublished] = useState<Design[]>([]);
  const [displayName, setDisplayName] = useState("Creator");
  const [bio, setBio] = useState("Creator on Loopa.");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!creatorId) return;

    // profile
    const p = getCreatorProfile(creatorId);
    if (p) {
      setDisplayName(p.displayName || "Creator");
      setBio(p.bio || "Creator on Loopa.");
    } else {
      setDisplayName("Creator");
      setBio("Creator on Loopa.");
    }

    // designs
    const all = listDesignsForUser(creatorId);
    setPublished(all.filter((d) => d.status === "published"));
  }, [mounted, creatorId]);

  const stats = useMemo(() => {
    const count = published.length;
    const tshirts = published.filter((d) => d.productType === "tshirt").length;
    const hoodies = published.filter((d) => d.productType === "hoodie").length;
    const newest = published
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

    return {
      count,
      tshirts,
      hoodies,
      newestText: newest ? new Date(newest.updatedAt).toLocaleDateString("nl-BE") : "—",
    };
  }, [published]);

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
        {/* Header / Branding */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-5">
            <div className="h-16 w-16 rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
              <span className="text-lg font-semibold text-zinc-900">{initials(displayName)}</span>
            </div>

            <div>
              <p className="text-xs font-medium tracking-widest text-zinc-500">CREATOR SHOP</p>
              <h1 className="mt-2 text-4xl font-semibold text-zinc-900">{displayName}</h1>
              <p className="mt-2 max-w-xl text-zinc-600">{bio}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700">
                  {stats.count} published
                </span>
                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700">
                  {stats.tshirts} T-shirts
                </span>
                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700">
                  {stats.hoodies} Hoodies
                </span>
                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700">
                  Latest update: {stats.newestText}
                </span>
              </div>

              <p className="mt-3 text-[11px] text-zinc-500">
                CreatorId (demo): <span className="font-medium text-zinc-900">{creatorId}</span>
              </p>
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

        {/* Content */}
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
              Local-first demo. Later: usernames (slug), profielfoto, socials, DB-backed creator profiles.
            </p>
          </>
        )}
      </div>
    </main>
  );
}