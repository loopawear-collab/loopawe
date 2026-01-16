"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { addToCart } from "@/lib/cart";
import { useCartUI } from "@/lib/cart-ui";
import { useAppToast } from "@/lib/toast";

import { getDesignById, type ColorOption, type Design } from "@/lib/designs";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

const SIZES = ["S", "M", "L", "XL", "XXXL"] as const;
type Size = (typeof SIZES)[number];

function pickPreview(d: Design): string | null {
  return d.previewFrontDataUrl || d.previewBackDataUrl || null;
}

export default function MarketplaceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => decodeURIComponent(params?.id ?? ""), [params]);

  const { openMiniCart } = useCartUI();
  const toast = useAppToast();

  const [mounted, setMounted] = useState(false);
  const [design, setDesign] = useState<Design | null>(null);

  const [size, setSize] = useState<Size>("M");
  const [color, setColor] = useState<ColorOption | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!id) return;
    const d = getDesignById(id);
    setDesign(d);

    if (d) {
      setSize("M");
      setColor(d.selectedColor ?? (d.allowedColors?.[0] ?? { name: "White", hex: "#ffffff" }));
    }
  }, [mounted, id]);

  const preview = useMemo(() => (design ? pickPreview(design) : null), [design]);

  if (!mounted) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <p className="text-sm text-zinc-600">Loading…</p>
        </div>
      </main>
    );
  }

  if (!design) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Design not found</h1>
          <p className="mt-2 text-zinc-600">Dit design bestaat niet (meer) lokaal.</p>
          <div className="mt-6">
            <Link
              href="/marketplace"
              className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Back to marketplace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const productLabel = design.productType === "hoodie" ? "Hoodie" : "T-shirt";
  const printLabel = design.printArea === "back" ? "Back" : "Front";

  const safeColor =
    color ??
    design.selectedColor ??
    (design.allowedColors?.[0] ?? { name: "White", hex: "#ffffff" });

  const allowedColors =
    Array.isArray(design.allowedColors) && design.allowedColors.length > 0
      ? design.allowedColors
      : [safeColor];

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* LEFT */}
          <div>
            <p className="text-xs font-medium tracking-widest text-zinc-500">MARKETPLACE</p>

            <h1 className="mt-2 text-4xl font-semibold text-zinc-900">
              {design.title || "Untitled design"}
            </h1>

            <p className="mt-2 text-zinc-600">{design.prompt || "—"}</p>

            <div className="mt-5 flex flex-wrap gap-2 text-sm text-zinc-700">
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1">
                {productLabel}
              </span>

              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1">
                Print: {printLabel}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1">
                <span
                  className="h-3 w-3 rounded-full border border-zinc-300"
                  style={{ backgroundColor: safeColor.hex }}
                />
                {safeColor.name}
              </span>
            </div>

            {/* BUY BOX */}
            <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Base price</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900">{eur(design.basePrice)}</p>
                  <p className="mt-1 text-xs text-zinc-500">Excl. shipping (demo)</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addToCart({
                      name: productLabel,
                      productType: design.productType,
                      designId: design.id,
                      price: design.basePrice,
                      quantity: 1,
                      color: safeColor.name,
                      colorHex: safeColor.hex,
                      size,
                      printArea: printLabel,
                      previewDataUrl: preview ?? undefined,
                    } as any);

                    toast.success("Added to cart ✓");
                    openMiniCart();
                  }}
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Add to cart
                </button>
              </div>

              {/* SIZE */}
              <div className="mt-6">
                <p className="text-xs font-medium tracking-widest text-zinc-500">SIZE</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={
                        "rounded-full px-4 py-2 text-sm border transition " +
                        (size === s
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* COLOR */}
              <div className="mt-6">
                <p className="text-xs font-medium tracking-widest text-zinc-500">COLOR</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allowedColors.map((c) => {
                    const active = (safeColor.hex ?? "").toLowerCase() === (c.hex ?? "").toLowerCase();
                    return (
                      <button
                        key={`${c.name}-${c.hex}`}
                        type="button"
                        onClick={() => setColor(c)}
                        className={
                          "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm border transition " +
                          (active
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                        }
                      >
                        <span
                          className={
                            "h-3 w-3 rounded-full border " + (active ? "border-white/60" : "border-zinc-300")
                          }
                          style={{ backgroundColor: c.hex }}
                        />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="mt-6 text-xs text-zinc-500">
                Premium UX: toast + minicart open. Later: Printful mockups + DB.
              </p>
            </div>

            <div className="mt-6">
              <Link href="/marketplace" className="text-sm text-zinc-600 hover:text-zinc-900">
                ← Back to marketplace
              </Link>
            </div>
          </div>

          {/* RIGHT */}
          <div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-6">
              <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-zinc-50 flex items-center justify-center">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt={design.title} className="h-full w-full object-contain" />
                ) : (
                  <p className="text-sm text-zinc-500">No preview available</p>
                )}
              </div>
              <p className="mt-4 text-xs text-zinc-500">Global toasts enabled.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}