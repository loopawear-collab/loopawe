"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addToCart } from "@/lib/cart";
import { useCartUI } from "@/lib/cart-ui";
import { listPublishedDesigns, type Design } from "@/lib/designs";
import { getCreatorProfile } from "@/lib/creator-profile";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

type SortKey = "newest" | "price_low" | "price_high";

function getPreview(d: Design): string | undefined {
  // ✅ preview-only (geen artworkDataUrl)
  return d.previewFrontDataUrl || d.previewBackDataUrl || undefined;
}

export default function MarketplacePage() {
  const { openMiniCart } = useCartUI();

  const [mounted, setMounted] = useState(false);
  const [designs, setDesigns] = useState<Design[]>([]);

  // Filters
  const [q, setQ] = useState("");
  const [product, setProduct] = useState<"all" | "tshirt" | "hoodie">("all");
  const [area, setArea] = useState<"all" | "front" | "back">("all");
  const [color, setColor] = useState<string>("all"); // hex or "all"
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    setDesigns(listPublishedDesigns());
  }, [mounted]);

  const filtered = useMemo(() => {
    if (!mounted) return [];

    const query = q.trim().toLowerCase();

    let out = designs.filter((d) => {
      if (product !== "all" && d.productType !== product) return false;
      if (area !== "all" && d.printArea !== area) return false;

      if (color !== "all") {
        const hex = (d.selectedColor?.hex ?? "").toLowerCase();
        if (hex !== color.toLowerCase()) return false;
      }

      if (query) {
        const t = (d.title ?? "").toLowerCase();
        const p = (d.prompt ?? "").toLowerCase();
        if (!t.includes(query) && !p.includes(query)) return false;
      }

      return true;
    });

    if (sort === "price_low") out = out.sort((a, b) => (a.basePrice ?? 0) - (b.basePrice ?? 0));
    if (sort === "price_high") out = out.sort((a, b) => (b.basePrice ?? 0) - (a.basePrice ?? 0));
    if (sort === "newest") {
      out = out.sort((a, b) => {
        const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        return tb - ta;
      });
    }

    return out;
  }, [mounted, designs, q, product, area, color, sort]);

  const countText = useMemo(() => {
    if (!mounted) return "—";
    const n = filtered.length;
    return `${n} ${n === 1 ? "design" : "designs"}`;
  }, [mounted, filtered.length]);

  const allColors = useMemo(() => {
    const map = new Map<string, { name: string; hex: string }>();
    for (const d of designs) {
      const hex = d.selectedColor?.hex;
      const name = d.selectedColor?.name;
      if (hex && name) map.set(hex.toLowerCase(), { hex, name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [designs]);

  function onQuickAdd(d: Design) {
    addToCart({
      name: d.productType === "hoodie" ? "Hoodie" : "T-shirt",
      price: d.basePrice,
      quantity: 1,
      color: d.selectedColor?.name ?? "White",
      size: "M",
      printArea: d.printArea === "back" ? "Back" : "Front",
      designId: d.id,
      productType: d.productType,
      colorHex: d.selectedColor?.hex ?? "#ffffff",
      previewDataUrl: d.previewFrontDataUrl || d.previewBackDataUrl || undefined,
    } as any);

    openMiniCart();
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
            <button
              type="button"
              onClick={() => openMiniCart()}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Cart
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="text-xs font-medium tracking-widest text-zinc-500">SEARCH</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title"
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
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
              <label className="text-xs font-medium tracking-widest text-zinc-500">COLOR</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
              >
                <option value="all">All colors</option>
                {allColors.map((c) => (
                  <option key={c.hex} value={c.hex}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-zinc-500">SORT</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
              >
                <option value="newest">Newest</option>
                <option value="price_low">Price: low</option>
                <option value="price_high">Price: high</option>
              </select>
            </div>
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            {q || product !== "all" || area !== "all" || color !== "all" || sort !== "newest"
              ? "Filters applied"
              : "No filters applied"}
          </p>
        </div>

        {/* Content */}
        <div className="mt-10">
          {!mounted ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-600">Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8">
              <h2 className="text-lg font-semibold text-zinc-900">No designs yet</h2>
              <p className="mt-2 text-zinc-600">
                Create a design in the designer and click <span className="font-medium">Publish</span>.
              </p>
              <div className="mt-6">
                <Link
                  href="/designer"
                  className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Go to designer
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((d) => {
                const preview = getPreview(d);

                const creator = getCreatorProfile(d.ownerId);
                const creatorName = creator?.displayName ?? "Creator"; // ✅ null-safe

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
                      <Link href={`/c/${encodeURIComponent(d.ownerId)}`} className="text-sm text-zinc-600 hover:text-zinc-900">
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
                      <Link href={`/marketplace/${encodeURIComponent(d.id)}`} className="text-sm text-zinc-600 hover:text-zinc-900">
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
          Pro UX: search + filters + sorting. Next: pagination + trending ranking.
        </p>
      </div>
    </main>
  );
}