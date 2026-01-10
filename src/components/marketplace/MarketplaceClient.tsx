"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Product = {
  id: string;
  slug: string;
  title: string;
  creator: string;
  price: number; // EUR
  rating: number; // 0-5
  reviews: number;
  badge?: "Trending" | "New" | "Limited";
  category: "T-shirt" | "Hoodie" | "Sweater";
  color: "White" | "Black" | "Navy" | "Sand" | "Pink" | "Purple" | "Red" | "Green";
  image: {
    gradientFrom: string; // tailwind class
    gradientTo: string;   // tailwind class
  };
};

const PRODUCTS: Product[] = [
  {
    id: "p1",
    slug: "midnight-rose",
    title: "Midnight Rose",
    creator: "Creator Studio",
    price: 34.99,
    rating: 4.8,
    reviews: 214,
    badge: "Trending",
    category: "T-shirt",
    color: "Navy",
    image: { gradientFrom: "from-zinc-200", gradientTo: "to-zinc-50" },
  },
  {
    id: "p2",
    slug: "neo-koi",
    title: "Neo Koi",
    creator: "Koi Labs",
    price: 39.99,
    rating: 4.6,
    reviews: 121,
    badge: "New",
    category: "Hoodie",
    color: "Black",
    image: { gradientFrom: "from-zinc-300", gradientTo: "to-white" },
  },
  {
    id: "p3",
    slug: "soft-spectrum",
    title: "Soft Spectrum",
    creator: "Loopawear Picks",
    price: 34.99,
    rating: 4.7,
    reviews: 89,
    badge: "Limited",
    category: "T-shirt",
    color: "Pink",
    image: { gradientFrom: "from-zinc-100", gradientTo: "to-zinc-50" },
  },
  {
    id: "p4",
    slug: "clean-lines",
    title: "Clean Lines",
    creator: "Minimal Studio",
    price: 34.99,
    rating: 4.4,
    reviews: 56,
    category: "T-shirt",
    color: "White",
    image: { gradientFrom: "from-zinc-100", gradientTo: "to-white" },
  },
  {
    id: "p5",
    slug: "purple-noise",
    title: "Purple Noise",
    creator: "Noise Dept.",
    price: 44.99,
    rating: 4.5,
    reviews: 73,
    badge: "New",
    category: "Sweater",
    color: "Purple",
    image: { gradientFrom: "from-zinc-200", gradientTo: "to-zinc-50" },
  },
  {
    id: "p6",
    slug: "sandstorm",
    title: "Sandstorm",
    creator: "Desert Drop",
    price: 34.99,
    rating: 4.3,
    reviews: 41,
    category: "T-shirt",
    color: "Sand",
    image: { gradientFrom: "from-zinc-100", gradientTo: "to-zinc-50" },
  },
  {
    id: "p7",
    slug: "green-signal",
    title: "Green Signal",
    creator: "Signal Works",
    price: 39.99,
    rating: 4.2,
    reviews: 38,
    badge: "Trending",
    category: "Hoodie",
    color: "Green",
    image: { gradientFrom: "from-zinc-200", gradientTo: "to-white" },
  },
  {
    id: "p8",
    slug: "red-metric",
    title: "Red Metric",
    creator: "Metric Lab",
    price: 34.99,
    rating: 4.1,
    reviews: 29,
    category: "T-shirt",
    color: "Red",
    image: { gradientFrom: "from-zinc-100", gradientTo: "to-white" },
  },
];

type SortKey = "featured" | "price_asc" | "price_desc" | "rating_desc";

function formatEUR(amount: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(amount);
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 shadow-sm">
      {children}
    </span>
  );
}

function Badge({ kind }: { kind: NonNullable<Product["badge"]> }) {
  const styles =
    kind === "Trending"
      ? "border-zinc-900 bg-zinc-900 text-white"
      : kind === "New"
      ? "border-zinc-900 bg-white text-zinc-900"
      : "border-zinc-300 bg-zinc-100 text-zinc-900";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}>
      {kind}
    </span>
  );
}

function ColorDot({ color }: { color: Product["color"] }) {
  // Visuele hint, later vervangen we dit door echte Printful kleuren
  const dot =
    color === "White"
      ? "bg-white border-zinc-200"
      : color === "Black"
      ? "bg-zinc-900 border-zinc-900"
      : color === "Navy"
      ? "bg-zinc-800 border-zinc-800"
      : color === "Sand"
      ? "bg-zinc-200 border-zinc-200"
      : color === "Pink"
      ? "bg-zinc-100 border-zinc-200"
      : color === "Purple"
      ? "bg-zinc-300 border-zinc-300"
      : color === "Red"
      ? "bg-zinc-400 border-zinc-400"
      : "bg-zinc-300 border-zinc-300";

  return <span className={`h-3 w-3 rounded-[4px] border ${dot}`} />;
}

function Rating({ rating, reviews }: { rating: number; reviews: number }) {
  const full = Math.floor(rating);
  const stars = Array.from({ length: 5 }).map((_, i) => i < full);

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-600">
      <div className="flex items-center gap-0.5">
        {stars.map((on, idx) => (
          <span key={idx} className={on ? "text-zinc-900" : "text-zinc-300"}>
            ★
          </span>
        ))}
      </div>
      <span className="text-zinc-500">
        {rating.toFixed(1)} ({reviews})
      </span>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>
      </div>
      <Link
        href="/designer"
        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
      >
        Start designing
      </Link>
    </div>
  );
}

function ProductCard({ p }: { p: Product }) {
  return (
    <Link
      href={`/marketplace?focus=${encodeURIComponent(p.slug)}`}
      className="group block rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative overflow-hidden rounded-2xl">
        <div className={`h-44 w-full bg-gradient-to-br ${p.image.gradientFrom} ${p.image.gradientTo}`} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          {p.badge ? <Badge kind={p.badge} /> : null}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">{p.title}</h3>
            <p className="mt-1 text-xs text-zinc-500">by {p.creator}</p>
          </div>
          <div className="text-sm font-semibold text-zinc-900">{formatEUR(p.price)}</div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Pill>{p.category}</Pill>
          <Pill>
            <span className="inline-flex items-center gap-2">
              <ColorDot color={p.color} />
              {p.color}
            </span>
          </Pill>
        </div>

        <div className="mt-3">
          <Rating rating={p.rating} reviews={p.reviews} />
        </div>
      </div>
    </Link>
  );
}

export default function MarketplaceClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | Product["category"]>("All");
  const [color, setColor] = useState<"All" | Product["color"]>("All");
  const [sort, setSort] = useState<SortKey>("featured");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = PRODUCTS.filter((p) => {
      const matchesQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.creator.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q);

      const matchesCategory = category === "All" ? true : p.category === category;
      const matchesColor = color === "All" ? true : p.color === color;

      return matchesQuery && matchesCategory && matchesColor;
    });

    list = [...list].sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "rating_desc") return b.rating - a.rating;

      // featured: Trending first, then New, then rest by rating
      const rank = (p: Product) =>
        p.badge === "Trending" ? 0 : p.badge === "New" ? 1 : p.badge === "Limited" ? 2 : 3;
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return b.rating - a.rating;
    });

    return list;
  }, [query, category, color, sort]);

  const trending = useMemo(() => PRODUCTS.filter((p) => p.badge === "Trending").slice(0, 4), []);
  const newDrops = useMemo(() => PRODUCTS.filter((p) => p.badge === "New").slice(0, 4), []);

  return (
    <div className="bg-white text-zinc-900">
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-10">
        <div className="mb-10">
          <p className="text-xs font-medium tracking-[0.22em] text-zinc-500">MARKETPLACE</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Discover premium designs
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Browse trending drops, clean minimal pieces, and creator collections. Later we plug in real Printful variants
            + DB — this UI stays.
          </p>
        </div>

        {/* Controls */}
        <div className="mb-10 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-6">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search designs, creators, categories…"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none ring-zinc-900/10 focus:ring-4"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none ring-zinc-900/10 focus:ring-4"
              >
                <option value="All">All</option>
                <option value="T-shirt">T-shirt</option>
                <option value="Hoodie">Hoodie</option>
                <option value="Sweater">Sweater</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Color</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value as any)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none ring-zinc-900/10 focus:ring-4"
              >
                <option value="All">All</option>
                <option value="White">White</option>
                <option value="Black">Black</option>
                <option value="Navy">Navy</option>
                <option value="Sand">Sand</option>
                <option value="Pink">Pink</option>
                <option value="Purple">Purple</option>
                <option value="Red">Red</option>
                <option value="Green">Green</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none ring-zinc-900/10 focus:ring-4"
              >
                <option value="featured">Featured</option>
                <option value="rating_desc">Top rated</option>
                <option value="price_asc">Price: low → high</option>
                <option value="price_desc">Price: high → low</option>
              </select>
            </div>

            <div className="md:col-span-9">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Quick tags</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                    setColor("All");
                    setSort("featured");
                  }}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Reset
                </button>
                <button
                  onClick={() => setSort("rating_desc")}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Best rated
                </button>
                <button
                  onClick={() => setCategory("T-shirt")}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  T-shirts
                </button>
                <button
                  onClick={() => setCategory("Hoodie")}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Hoodies
                </button>
                <button
                  onClick={() => setCategory("Sweater")}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Sweaters
                </button>
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Results</label>
              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-700">
                {filtered.length} items
              </div>
            </div>
          </div>
        </div>

        {/* Trending */}
        <div className="mb-10">
          <SectionTitle title="Trending now" subtitle="What people are buying today." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>

        {/* New Drops */}
        <div className="mb-10">
          <SectionTitle title="New drops" subtitle="Fresh designs added recently." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {newDrops.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>

        {/* All results */}
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Browse all</h2>
              <p className="mt-1 text-sm text-zinc-600">Filter by category, color and sort. Click cards later to go detail.</p>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-600">
              No results. Try a different search or reset filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}