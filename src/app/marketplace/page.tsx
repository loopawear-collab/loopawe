"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAppToast } from "@/lib/toast";
import { listPublishedDesigns, type Design } from "@/lib/designs";
import { getCreatorProfile } from "@/lib/creator-profile";
import { addToCartAndOpenMiniCart } from "@/lib/cart-actions";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

type SortKey = "newest" | "price_low" | "price_high";

const DEFAULT_SIZE = "M";

function getPreview(d: Design): string | undefined {
  return d.previewFrontDataUrl || d.previewBackDataUrl || undefined;
}

function productLabel(d: Design) {
  return d.productType === "hoodie" ? "Hoodie" : "T-shirt";
}

function areaLabel(d: Design) {
  return d.printArea === "back" ? "Back" : "Front";
}

export default function MarketplacePage() {
  const toast = useAppToast();

  const [mounted, setMounted] = useState(false);
  const [designs, setDesigns] = useState<Design[]>([]);

  // Search
  const [q, setQ] = useState("");

  // Filters
  const [product, setProduct] = useState<"all" | "tshirt" | "hoodie">("all");
  const [area, setArea] = useState<"all" | "front" | "back">("all");
  const [color, setColor] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => setMounted(true), []);

  function reload() {
    setDesigns(listPublishedDesigns());
  }

  useEffect(() => {
    if (!mounted) return;
    reload();
  }, [mounted]);

  // ✅ Cache creator names once per designs-set (avoid calling getCreatorProfile in loops)
  const creatorNameByOwnerId = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of designs) {
      const ownerId = d.ownerId;
      if (!ownerId || map.has(ownerId)) continue;
      const p = getCreatorProfile(ownerId);
      map.set(ownerId, (p?.displayName ?? "Creator").trim() || "Creator");
    }
    return map;
  }, [designs]);

  const allColors = useMemo(() => {
    const map = new Map<string, { name: string; hex: string }>();
    for (const d of designs) {
      const hex = d.selectedColor?.hex;
      const name = d.selectedColor?.name;
      if (hex && name) map.set(hex.toLowerCase(), { hex, name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [designs]);

  const filtered = useMemo(() => {
    if (!mounted) return [];

    const query = q.trim().toLowerCase();

    // ✅ never sort in-place: start from a copy
    let out = [...designs].filter((d) => {
      if (product !== "all" && d.productType !== product) return false;
      if (area !== "all" && d.printArea !== area) return false;

      if (color !== "all") {
        const hex = (d.selectedColor?.hex ?? "").toLowerCase();
        if (hex !== color.toLowerCase()) return false;
      }

      if (query) {
        const title = (d.title ?? "").toLowerCase();
        const prompt = (d.prompt ?? "").toLowerCase();
        const creatorName = (creatorNameByOwnerId.get(d.ownerId) ?? "creator").toLowerCase();
        const haystack = `${title} ${prompt} ${creatorName}`;
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
  }, [mounted, designs, q, product, area, color, sort, creatorNameByOwnerId]);

  const countText = useMemo(() => {
    if (!mounted) return "—";
    const n = filtered.length;
    return `${n} ${n === 1 ? "design" : "designs"}`;
  }, [mounted, filtered.length]);

  const hasActiveFilters = useMemo(() => {
    return (
      q.trim().length > 0 ||
      product !== "all" ||
      area !== "all" ||
      color !== "all" ||
      sort !== "newest"
    );
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

  function Chip({ children }: { children: React.ReactNode }) {
    return (
      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700">
        {children}
      </span>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium tracking-widest text-zinc-500">MARKETPLACE</p>
            <h1 className="mt-2 text-4xl font-semibold text-zinc-900">Trending designs</h1>
            <p className="mt-2 text-zinc-600">
              Published designs • <span className="font-medium text-zinc-900">{countText}</span>
            </p>

            {/* Active filters */}
            {mounted && hasActiveFilters ? (
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
                  placeholder="Zoek op titel, prompt of creator…"
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
              <p className="mt-2 text-xs text-zinc-500">Tip: zoek ook op creator naam.</p>
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
            <p className="text-xs text-zinc-500">
              {q.trim() ? `Zoekterm: “${q.trim()}”` : "Geen zoekterm"} • {countText}
            </p>

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
        <div className="mt-10">
          {!mounted ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-600">Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8">
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
                <Link
                  href="/designer"
                  className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Maak een design
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((d) => {
                const preview = getPreview(d);
                const creatorName = creatorNameByOwnerId.get(d.ownerId) ?? "Creator";

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
                      <Link
                        href={`/c/${encodeURIComponent(d.ownerId)}`}
                        className="text-sm text-zinc-600 hover:text-zinc-900"
                      >
                        by {creatorName} →
                      </Link>
                      <span className="text-sm font-semibold text-zinc-900">{eur(d.basePrice)}</span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm">
                        <span
                          className="h-3 w-3 rounded-full border border-zinc-300"
                          style={{ backgroundColor: d.selectedColor?.hex ?? "#ffffff" }}
                        />
                        {d.selectedColor?.name ?? "Color"}
                      </span>

                      <button
                        type="button"
                        onClick={() => onQuickAdd(d)}
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
          Consistent add-to-cart: één centrale helper (cart-actions) opent altijd mini-cart + refresh.
        </p>
      </div>
    </main>
  );
}