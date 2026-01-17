"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { getDesignById, type Design } from "@/lib/designs";
import { getCreatorProfile } from "@/lib/creator-profile";
import { addToCartAndOpenMiniCart } from "@/lib/cart-actions";
import { useAppToast } from "@/lib/toast";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

function pickPreview(d: Design): string | null {
  return d.previewFrontDataUrl || d.previewBackDataUrl || null;
}

export default function MarketplaceDetailPage() {
  const toast = useAppToast();

  const params = useParams<{ id: string }>();
  const id = useMemo(() => decodeURIComponent(params?.id ?? ""), [params]);

  const [mounted, setMounted] = useState(false);
  const [design, setDesign] = useState<Design | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!id) return;
    setDesign(getDesignById(id));
  }, [mounted, id]);

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
          <h1 className="text-2xl font-semibold text-zinc-900">Design niet gevonden</h1>
          <p className="mt-2 text-zinc-600">
            Dit design bestaat (niet meer) in local storage.
          </p>
          <div className="mt-6">
            <Link
              href="/marketplace"
              className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Terug naar marketplace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const preview = pickPreview(design);
  const creator = getCreatorProfile(design.ownerId);
  const creatorName = creator?.displayName ?? "Creator";

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          {/* Left */}
          <div className="lg:max-w-xl">
            <p className="text-xs font-medium tracking-widest text-zinc-500">MARKETPLACE</p>
            <h1 className="mt-2 text-4xl font-semibold text-zinc-900">
              {design.title || "Untitled design"}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link
                href={`/c/${encodeURIComponent(design.ownerId)}`}
                className="text-sm text-zinc-600 hover:text-zinc-900"
              >
                by {creatorName} →
              </Link>

              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm">
                <span
                  className="h-3 w-3 rounded-full border border-zinc-300"
                  style={{ backgroundColor: design.selectedColor?.hex ?? "#ffffff" }}
                />
                {design.selectedColor?.name ?? "Color"}
              </span>

              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700">
                {design.productType === "hoodie" ? "Hoodie" : "T-shirt"}
              </span>

              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700">
                Print: {design.printArea === "back" ? "Back" : "Front"}
              </span>
            </div>

            <p className="mt-4 text-zinc-600">{design.prompt || "—"}</p>

            {/* Price + CTA */}
            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">Base price</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900">
                    {eur(design.basePrice)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addToCartAndOpenMiniCart({
                      name: design.productType === "hoodie" ? "Hoodie" : "T-shirt",
                      productType: design.productType,
                      price: design.basePrice,
                      quantity: 1,
                      color: design.selectedColor?.name ?? "White",
                      colorHex: design.selectedColor?.hex ?? undefined,
                      size: "M",
                      printArea: design.printArea === "back" ? "Back" : "Front",
                      designId: design.id,
                      previewDataUrl: design.previewFrontDataUrl || design.previewBackDataUrl || undefined,
                    });

                    toast.success("Added to cart ✓");
                  }}
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Add to cart
                </button>
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                Later: echte product varianten (maat/kleur) + Printful fulfilment.
              </p>
            </div>

            <div className="mt-6">
              <Link href="/marketplace" className="text-sm text-zinc-600 hover:text-zinc-900">
                ← Terug naar marketplace
              </Link>
            </div>
          </div>

          {/* Right (Preview) */}
          <div className="lg:w-[420px]">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6">
              <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-zinc-50 flex items-center justify-center">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt={design.title} className="h-full w-full object-contain" />
                ) : (
                  <p className="text-sm text-zinc-500">No preview available</p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                <span>Local-first preview</span>
                <span>{design.status === "published" ? "Published" : "Draft"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}