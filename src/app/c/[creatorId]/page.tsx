"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { useAppToast } from "@/lib/toast";
import { listDesignsForUser, type Design } from "@/lib/designs";
import { getCreatorProfile } from "@/lib/creator-profile";
import { addToCartAndOpenMiniCart } from "@/lib/cart-actions";

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

type SortKey = "newest" | "price_low" | "price_high";
const DEFAULT_SIZE = "M";

function productLabel(d: Design) {
  return d.productType === "hoodie" ? "Hoodie" : "T-shirt";
}

function printAreaLabel(d: Design) {
  return d.printArea === "back" ? "Back" : "Front";
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}

export default function CreatorShopPage() {
  const toast = useAppToast();

  const params = useParams<{ creatorId: string }>();
  const creatorId = useMemo(() => decodeURIComponent(params?.creatorId ?? ""), [params]);

  const [mounted, setMounted] = useState(false);
  const [published, setPublished] = useState<Design[]>([]);
  const [displayName, setDisplayName] = useState("Creator");
  const [bio, setBio] = useState("Creator on Loopa.");

  // Search + filters
  const [q, setQ] = useState("");
  const [product, setProduct] = useState<"all" | "tshirt" | "hoodie">("all");
  const [area, setArea] = useState<"all" | "front" | "back">("all");
  const [color, setColor] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => setMounted(true), []);

  function reload() {
    if (!creatorId) return;

    // profile
    const p = getCreatorProfile(creatorId);
    setDisplayName((p?.displayName ?? "Creator").trim() || "Creator");
    setBio((p?.bio ?? "Creator on Loopa.").trim() || "Creator on Loopa.");

    // designs (published only)
    const all = listDesignsForUser(creatorId);
    const pub = all.filter((d) => d.status === "published");
    setPublished(pub);
  }

  useEffect(() => {
    if (!mounted) return;
    if (!creatorId) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, creatorId]);

  const allColors = useMemo(() => {
    const map = new Map<string, { name: string; hex: string }>();
    for (const d of published) {
      const hex = d.selectedColor?.hex;
      const name = d.selectedColor?.name;
      if (hex && name) map.set(hex.toLowerCase(), { hex, name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [published]);

  const filtered = useMemo(() => {
    if (!mounted) return [];
    const query = q.trim().toLowerCase();

    let out = [...published].filter((d) => {
      if (product !== "all" && d.productType !== product) return false;
      if (area !== "all" && d.printArea !== area) return false;

      if (color !== "all") {
        const hex = (d.selectedColor?.hex ?? "").toLowerCase();
        if (hex !== color.toLowerCase()) return false;
      }

      if (query) {
        const title = (d.title ?? "").toLowerCase();
        const prompt = (d.prompt ?? "").toLowerCase();
        const haystack = `${title} ${prompt}`;
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    if (sort === "price_low") out.sort((a, b) => (a.basePrice ?? 0) - (b.basePrice ?? 0));
    if (sort === "price_high") out.sort((a, b) => (b.basePrice ?? 0) - (a.basePrice ?? 0));
    if (sort === "newest") {
      out.sort((a, b) => {
        const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        return tb - ta;
      });
    }

    return out;
  }, [mounted, published, q, product, area, color, sort]);

  const stats = useMemo(() => {
    const count = published.length;
    const tshirts = published.filter((d) => d.productType === "tshirt").length;
    const hoodies = published.filter((d) => d.productType === "hoodie").length;

    const newest = [...published].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    const newestText = newest ? new Date(newest.updatedAt).toLocaleDateString("nl-BE") : "—";

    const minPrice = published.length
      ? Math.min(...published.map((d) => (Number.isFinite(d.basePrice) ? (d.basePrice as number) : 0)).filter((x) => x > 0))
      : 0;

    return {
      count,
      tshirts,
      hoodies,
      newestText,
      fromPrice: minPrice > 0 ? minPrice : null,
    };
  }, [published]);

  const countText = useMemo(() => {
    if (!mounted) return "—";
    const n = filtered.length;
    return `${n} ${n === 1 ? "design" : "designs"}`;
  }, [mounted, filtered.length]);

  const hasActiveFilters = useMemo(() => {
    return q.trim().length > 0 || product !== "all" || area !== "all" || color !== "all" || sort !== "newest";
  }, [q, product, area, color, sort]);

  function resetFilters() {
    setQ("");
    setProduct("all");
    setArea("all");
    setColor("all");
    setSort("newest");
  }

  function onQuickAdd(d: Design) {
    const price = Number(d.basePrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Prijs ontbreekt op dit design.");
      return;
    }

    addToCartAndOpenMiniCart({
      name: productLabel(d),
      productType: d.productType,
      price,
      quantity: 1,
      color: d.selectedColor?.name ?? "White",
      colorHex: d.selectedColor?.hex ?? undefined,
      size: DEFAULT_SIZE,
      printArea: d.printArea === "back" ? "Back" : "Front",
      designId: d.id,
      previewDataUrl: d.previewFrontDataUrl || d.previewBackDataUrl || undefined,
    });

    toast.success("Added to cart ✓");
  }

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

            <div className="min-w-0">
              <p className="text-xs font-medium tracking-widest text-zinc-500">CREATOR SHOP</p>
              <h1 className="mt-2 text-4xl font-semibold text-zinc-900 truncate">{displayName}</h1>
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
                {stats.fromPrice !== null ? (
                  <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700">
                    Vanaf {eur(stats.fromPrice)}
                  </span>
                ) : null}
              </div>

              {hasActiveFilters ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {q.trim() ? <Chip>Zoek: “{q.trim()}”</Chip> : null}
                  {product !== "all" ? <Chip>Product: {product === "tshirt" ? "T-shirt" : "Hoodie"}</Chip> : null}
                  {area !== "all" ? <Chip>Area: {area === "front" ? "Front" : "Back"}</Chip> : null}
                  {color !== "all" ? (
                    <Chip>
                      Kleur:{" "}
                      {allColors.find((c) => c.hex.toLowerCase() === color.toLowerCase())?.name ?? "Selected"}
                    </Chip>
                  ) : null}
                  {sort !== "newest" ? (
                    <Chip>
                      Sort:{" "}
                      {sort === "price_low" ? "Prijs laag" : sort === "price_high" ? "Prijs hoog" : "Nieuwste"}
                    </Chip>
                  ) : null}

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="ml-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Reset filters
                  </button>
                </div>
              ) : null}
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
            <button
              type="button"
              onClick={reload}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="text-xs font-medium tracking-widest text-zinc-500">ZOEKEN</label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-zinc-900/10">
                <span className="text-zinc-400">⌕</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Zoek op titel of prompt…"
                  className="w-full bg-transparent text-sm text-zinc-900 outline-none"
                />
                {q.trim().length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-zinc-500">PRODUCT</label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value as any)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
              >
                <option value="all">All</option>
                <option value="tshirt">T-shirt</option>
                <option value="hoodie">Hoodie</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-zinc-500">PRINT AREA</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value as any)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
              >
                <option value="all">All</option>
                <option value="front">Front</option>
                <option value="back">Back</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-zinc-500">KLEUR</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
              >
                <option value="all">Alle kleuren</option>
                {allColors.map((c) => (
                  <option key={c.hex} value={c.hex}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">{countText}</p>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium tracking-widest text-zinc-500">SORT</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none hover:bg-zinc-50"
              >
                <option value="newest">Nieuwste</option>
                <option value="price_low">Prijs laag</option>
                <option value="price_high">Prijs hoog</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {published.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-8">
            <h2 className="text-lg font-semibold text-zinc-900">Nog geen published designs</h2>
            <p className="mt-2 text-zinc-600">Publish een design in de designer om het hier te tonen.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/designer"
                className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Naar designer
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Naar marketplace
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-8">
            <h2 className="text-lg font-semibold text-zinc-900">Geen resultaten</h2>
            <p className="mt-2 text-zinc-600">Probeer een andere zoekterm of pas je filters aan.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Reset
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((d) => {
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
                        <h3 className="mt-1 text-lg font-semibold text-zinc-900">{d.title || "Untitled design"}</h3>
                        <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{d.prompt || "—"}</p>
                      </div>
                    </Link>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-900">{eur(d.basePrice ?? 0)}</span>

                      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm">
                        <span
                          className="h-3 w-3 rounded-full border border-zinc-300"
                          style={{ backgroundColor: d.selectedColor?.hex ?? "#ffffff" }}
                        />
                        {d.selectedColor?.name ?? "Color"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <Link
                        href={`/marketplace/${encodeURIComponent(d.id)}`}
                        className="text-sm text-zinc-600 hover:text-zinc-900"
                      >
                        View details →
                      </Link>

                      <button
                        type="button"
                        onClick={() => onQuickAdd(d)}
                        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                      >
                        Add
                      </button>
                    </div>

                    <p className="mt-3 text-xs text-zinc-500">
                      {productLabel(d)} • {printAreaLabel(d)}
                    </p>
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