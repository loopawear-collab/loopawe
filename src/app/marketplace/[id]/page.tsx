"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { listPublishedDesigns, type Design } from "@/lib/designs";
import { addToCart } from "@/lib/cart";

const SIZES = ["S", "M", "L", "XL", "XXXL"] as const;

function eur(value: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(value);
}

function basePriceFor(d: Design) {
  return d.productType === "hoodie" ? 49.99 : 34.99;
}

function productNameFor(d: Design) {
  const typeLabel = d.productType === "hoodie" ? "Hoodie" : "T-shirt";
  return `${typeLabel} — ${d.title}`;
}

export default function MarketplaceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ? String(params.id) : "";

  const [mounted, setMounted] = useState(false);
  const [design, setDesign] = useState<Design | null>(null);
  const [all, setAll] = useState<Design[]>([]);

  const [selectedColorName, setSelectedColorName] = useState<string>("White");
  const [selectedSize, setSelectedSize] = useState<(typeof SIZES)[number]>("M");
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    try {
      const published = listPublishedDesigns() ?? [];
      setAll(published);

      const found = published.find((d) => d.id === id) ?? null;
      setDesign(found);

      const firstColor = found?.allowedColors?.[0]?.name ?? found?.baseColorName ?? "White";
      setSelectedColorName(firstColor);
      setSelectedSize("M");
      setQty(1);
    } catch {
      setAll([]);
      setDesign(null);
    }
  }, [id]);

  const price = useMemo(() => (design ? basePriceFor(design) : 0), [design]);

  const related = useMemo(() => {
    if (!design) return [];
    const others = all.filter((d) => d.id !== design.id);
    const sameType = others.filter((d) => d.productType === design.productType);
    const pool = sameType.length >= 3 ? sameType : others;

    const seed = design.id.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
    const shuffled = [...pool].sort((a, b) => {
      const ha = a.id.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
      const hb = b.id.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
      return (ha + seed) % 97 - (hb + seed) % 97;
    });

    return shuffled.slice(0, 4);
  }, [all, design]);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1200);
  }

  function onAddToCart() {
    if (!design) return;

    addToCart({
      name: productNameFor(design),
      color: selectedColorName,
      size: selectedSize,
      printArea: design.printArea,
      price: basePriceFor(design),
      quantity: qty,
    } as any);

    notify("Added to cart ✓");
    router.push("/cart");
  }

  function quickAdd(d: Design) {
    const price = basePriceFor(d);
    const color = d.allowedColors?.[0]?.name ?? d.baseColorName ?? "White";

    addToCart({
      name: productNameFor(d),
      color,
      size: "M",
      printArea: d.printArea,
      price,
      quantity: 1,
    } as any);

    notify("Added to cart ✓");
    router.push("/cart");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-8">
        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/marketplace" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              ← Back to marketplace
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">Product</h1>
            <p className="mt-2 text-sm text-zinc-600">Choose options and add to cart.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/account"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Account
            </Link>
            <Link
              href="/cart"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Cart
            </Link>
          </div>
        </div>

        {toast ? (
          <div className="inline-flex w-fit rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white">
            {toast}
          </div>
        ) : null}

        {/* Main card */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          {!mounted ? (
            <div className="space-y-4">
              <div className="h-6 w-44 rounded bg-zinc-100" />
              <div className="h-40 rounded-2xl border border-zinc-200 bg-zinc-50" />
            </div>
          ) : !design ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8">
              <h2 className="text-lg font-semibold text-zinc-900">Not found</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Dit design bestaat niet (meer) of is niet gepubliceerd.
              </p>
              <div className="mt-6">
                <Link
                  href="/marketplace"
                  className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Back to marketplace
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Left: preview */}
              <section>
                <p className="text-xs font-semibold tracking-[0.35em] text-zinc-400">LOOPA</p>
                <h2 className="mt-2 text-3xl font-semibold text-zinc-900">{design.title}</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  {design.productType} • {design.printArea}
                </p>

                <div className="mt-8 rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
                  {design.previewDataUrl ? (
                    <img
                      src={design.previewDataUrl}
                      alt={`${design.title} preview`}
                      className="mx-auto h-[460px] w-full max-w-[520px] rounded-2xl bg-white object-contain shadow-sm"
                    />
                  ) : (
                    <div className="mx-auto flex h-[460px] w-full max-w-[520px] items-center justify-center rounded-2xl bg-white text-sm text-zinc-500 shadow-sm">
                      Preview coming soon
                    </div>
                  )}
                </div>

                {design.prompt ? <p className="mt-6 text-sm text-zinc-700">{design.prompt}</p> : null}
              </section>

              {/* Right: options */}
              <aside className="space-y-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-900">Price</p>
                    <p className="text-sm font-semibold text-zinc-900">{eur(price)}</p>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">Demo price — later: Printful variant pricing.</p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <p className="text-sm font-semibold text-zinc-900">Color</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(design.allowedColors ?? []).length === 0 ? (
                      <span className="text-sm text-zinc-600">Default: White</span>
                    ) : (
                      (design.allowedColors ?? []).map((c) => {
                        const active = selectedColorName === c.name;
                        return (
                          <button
                            key={c.name}
                            onClick={() => setSelectedColorName(c.name)}
                            className={
                              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold " +
                              (active
                                ? "bg-zinc-900 text-white"
                                : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                            }
                          >
                            <span className="h-3 w-3 rounded-full border border-zinc-200" style={{ backgroundColor: c.hex }} />
                            {c.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <p className="text-sm font-semibold text-zinc-900">Size</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SIZES.map((s) => {
                      const active = selectedSize === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setSelectedSize(s)}
                          className={
                            "rounded-full px-4 py-2 text-sm font-semibold " +
                            (active
                              ? "bg-zinc-900 text-white"
                              : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                          }
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Quantity</p>
                      <p className="mt-1 text-xs text-zinc-500">Add multiple at once</p>
                    </div>

                    <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white">
                      <button
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="rounded-l-full px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                      >
                        −
                      </button>
                      <div className="min-w-[56px] text-center text-sm font-semibold text-zinc-900">{qty}</div>
                      <button
                        onClick={() => setQty((q) => q + 1)}
                        className="rounded-r-full px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={onAddToCart}
                    className="mt-6 w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                  >
                    Add to cart
                  </button>

                  <p className="mt-4 text-xs text-zinc-500">
                    Selected: <span className="font-medium text-zinc-700">{selectedColorName}</span> •{" "}
                    <span className="font-medium text-zinc-700">{selectedSize}</span> • x
                    <span className="font-medium text-zinc-700">{qty}</span>
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>

        {/* Related designs */}
        {mounted && design ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">More designs you might like</h3>
                <p className="mt-2 text-sm text-zinc-600">Similar picks from the marketplace.</p>
              </div>
              <Link href="/marketplace" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
                View all →
              </Link>
            </div>

            {related.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-600">No related designs yet.</p>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {related.map((rd) => {
                  const rPrice = basePriceFor(rd);

                  return (
                    <div key={rd.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                        {rd.previewDataUrl ? (
                          <img
                            src={rd.previewDataUrl}
                            alt={`${rd.title} preview`}
                            className="h-40 w-full rounded-lg bg-white object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-40 items-center justify-center rounded-lg bg-white text-xs text-zinc-500">
                            Preview
                          </div>
                        )}
                      </div>

                      <p className="mt-3 truncate text-sm font-semibold text-zinc-900">{rd.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {rd.productType} • {rd.printArea}
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-zinc-900">{eur(rPrice)}</span>
                        <span className="text-xs text-zinc-500">Size M</span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => quickAdd(rd)}
                          className="rounded-full bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => router.push(`/marketplace/${encodeURIComponent(rd.id)}`)}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}