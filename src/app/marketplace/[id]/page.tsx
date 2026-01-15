// src/app/marketplace/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDesignById, type Design } from "@/lib/designs";
import { addToCart } from "@/lib/cart";
import { useCartUI, emitCartUpdated } from "@/lib/cart-ui";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

export default function MarketplaceDetailPage() {
  const { open } = useCartUI();
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
          <h1 className="text-2xl font-semibold text-zinc-900">Design not found</h1>
          <p className="mt-2 text-zinc-600">Dit design bestaat niet (meer) in local storage.</p>
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

  const preview = design.previewFrontDataUrl || design.previewBackDataUrl || undefined;
  const price =
    Number.isFinite(design.basePrice) ? design.basePrice : design.productType === "hoodie" ? 49.99 : 34.99;

  const colorName = design.selectedColor?.name ?? "White";
  const colorHex = design.selectedColor?.hex ?? "#ffffff";

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="flex items-center justify-between">
          <Link href="/marketplace" className="text-sm text-zinc-600 hover:text-zinc-900">
            ← Back
          </Link>

          <Link
            href={`/c/${encodeURIComponent(design.ownerId)}`}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            View creator shop →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Preview */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-zinc-50 flex items-center justify-center">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={design.title} className="h-full w-full object-contain" />
              ) : (
                <p className="text-sm text-zinc-500">No preview available</p>
              )}
            </div>
            <p className="mt-4 text-xs text-zinc-500">Later: echte Printful mockups.</p>
          </div>

          {/* Info */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-8">
            <p className="text-sm text-zinc-500">
              {design.productType === "hoodie" ? "HOODIE" : "T-SHIRT"} •{" "}
              {design.printArea === "back" ? "BACK" : "FRONT"}
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-zinc-900">{design.title}</h1>
            <p className="mt-3 text-zinc-600">{design.prompt || "—"}</p>

            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1">
                <span className="h-3 w-3 rounded-full border border-zinc-300" style={{ backgroundColor: colorHex }} />
                {colorName}
              </span>
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 font-semibold text-zinc-900">
                {eur(price)}
              </span>
            </div>

            <button
              onClick={() => {
                addToCart({
                  name: design.productType === "hoodie" ? "Hoodie" : "T-shirt",
                  productType: design.productType,
                  designId: design.id,
                  color: colorName,
                  colorHex,
                  size: "M",
                  printArea: design.printArea === "back" ? "Back" : "Front",
                  price,
                  quantity: 1,
                  previewDataUrl: preview,
                } as any);

                emitCartUpdated();
                open();
              }}
              className="mt-8 w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Add to cart
            </button>

            <p className="mt-4 text-xs text-zinc-500">
              Mini cart opent rechts zodat je meteen naar Cart/Checkout kan.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}