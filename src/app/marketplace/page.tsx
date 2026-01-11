"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export default function MarketplacePage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Modal state
  const [open, setOpen] = useState(false);
  const [activeDesign, setActiveDesign] = useState<Design | null>(null);
  const [selectedColorName, setSelectedColorName] = useState<string>("White");
  const [selectedSize, setSelectedSize] = useState<(typeof SIZES)[number]>("M");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setMounted(true);
    try {
      setDesigns(listPublishedDesigns() ?? []);
    } catch {
      setDesigns([]);
    }
  }, []);

  const countText = useMemo(() => {
    if (!mounted) return "—";
    const n = designs.length;
    return `${n} ${n === 1 ? "design" : "designs"}`;
  }, [mounted, designs.length]);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1200);
  }

  function refresh() {
    try {
      setDesigns(listPublishedDesigns() ?? []);
    } catch {
      setDesigns([]);
    }
  }

  function openModal(d: Design) {
    setActiveDesign(d);

    const firstColor = d.allowedColors?.[0]?.name;
    setSelectedColorName(firstColor ?? "White");

    setSelectedSize("M");
    setQty(1);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  function confirmAddToCart() {
    if (!activeDesign) return;

    addToCart({
      name: productNameFor(activeDesign),
      color: selectedColorName,
      size: selectedSize,
      printArea: activeDesign.printArea,
      price: basePriceFor(activeDesign),
      quantity: qty,
    } as any);

    notify("Added to cart ✓");
    setOpen(false);
    router.push("/cart");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Marketplace</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Published designs (local-first) •{" "}
              <span className="font-medium text-zinc-900">{countText}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={refresh}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Refresh
            </button>

            <Link
              href="/designer"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Make a design
            </Link>

            <Link
              href="/account"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Account
            </Link>
          </div>
        </div>

        {toast ? (
          <div className="inline-flex w-fit rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white">
            {toast}
          </div>
        ) : null}

        {/* Body */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          {!mounted ? (
            <div className="space-y-4">
              <div className="h-6 w-40 rounded bg-zinc-100" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="h-44 rounded-2xl border border-zinc-200 bg-zinc-50" />
                <div className="h-44 rounded-2xl border border-zinc-200 bg-zinc-50" />
                <div className="h-44 rounded-2xl border border-zinc-200 bg-zinc-50" />
              </div>
            </div>
          ) : designs.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8">
              <h2 className="text-lg font-semibold text-zinc-900">Nog geen designs</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Publish een design vanuit je account, dan verschijnt het hier.
              </p>
              <div className="mt-6">
                <Link
                  href="/designer"
                  className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Naar de designer
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {designs.map((d) => {
                const price = basePriceFor(d);
                const colorCount = d.allowedColors?.length ?? 0;

                return (
                  <article key={d.id} className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-500">LOOPA</p>
                        <h3 className="mt-1 truncate text-lg font-semibold text-zinc-900">{d.title}</h3>
                        <p className="mt-1 text-sm text-zinc-600">
                          {d.productType} • {d.printArea}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-zinc-500">From</p>
                        <p className="text-lg font-semibold text-zinc-900">{eur(price)}</p>
                      </div>
                    </div>

                    {d.prompt ? (
                      <p className="mt-4 line-clamp-3 text-sm text-zinc-700">{d.prompt}</p>
                    ) : (
                      <p className="mt-4 text-sm text-zinc-500">No prompt.</p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {(d.allowedColors ?? []).slice(0, 4).map((c) => (
                        <span
                          key={c.name}
                          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700"
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-zinc-200"
                            style={{ backgroundColor: c.hex }}
                          />
                          {c.name}
                        </span>
                      ))}
                      {colorCount > 4 ? (
                        <span className="text-xs text-zinc-500">+{colorCount - 4} more</span>
                      ) : null}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        onClick={() => openModal(d)}
                        className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                      >
                        Add to cart
                      </button>

                      <Link
                        href={`/marketplace/${encodeURIComponent(d.id)}`}
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                      >
                        View
                      </Link>

                      <Link
                        href="/designer"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                      >
                        Customize
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className="mt-8 text-xs text-zinc-500">
            Next: product detail page images + real pricing per variant + Printful + Stripe.
          </p>
        </div>
      </div>

      {/* Modal */}
      {open && activeDesign ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" aria-modal="true" role="dialog">
          <button onClick={closeModal} className="absolute inset-0 bg-black/40" aria-label="Close modal" />

          <div className="relative w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.35em] text-zinc-400">LOOPA</p>
                <h2 className="mt-2 truncate text-2xl font-semibold text-zinc-900">{activeDesign.title}</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {activeDesign.productType} • {activeDesign.printArea}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-6">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-900">Price</p>
                  <p className="text-sm font-semibold text-zinc-900">{eur(basePriceFor(activeDesign))}</p>
                </div>
                <p className="mt-1 text-xs text-zinc-500">Demo price.</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-zinc-900">Color</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(activeDesign.allowedColors ?? []).length === 0 ? (
                    <span className="text-sm text-zinc-600">No colors set (default White)</span>
                  ) : (
                    (activeDesign.allowedColors ?? []).map((c) => {
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

              <div>
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

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Quantity</p>
                  <p className="mt-1 text-xs text-zinc-500">Add multiple at once</p>
                </div>

                <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="rounded-l-full px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
                    −
                  </button>
                  <div className="min-w-[56px] text-center text-sm font-semibold text-zinc-900">{qty}</div>
                  <button onClick={() => setQty((q) => q + 1)} className="rounded-r-full px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={confirmAddToCart}
                  className="w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Add to cart
                </button>

                <Link
                  href={`/marketplace/${encodeURIComponent(activeDesign.id)}`}
                  className="w-full rounded-full border border-zinc-200 bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                  onClick={() => setOpen(false)}
                >
                  View details
                </Link>
              </div>

              <p className="text-xs text-zinc-500">
                Selected: <span className="font-medium text-zinc-700">{selectedColorName}</span> •{" "}
                <span className="font-medium text-zinc-700">{selectedSize}</span> • x
                <span className="font-medium text-zinc-700">{qty}</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}