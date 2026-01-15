// src/app/marketplace/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDesignById, type Design } from "@/lib/designs";
import { addToCart } from "@/lib/cart";

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

export default function MarketplaceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => decodeURIComponent(params?.id ?? ""), [params]);

  const [mounted, setMounted] = useState(false);
  const [design, setDesign] = useState<Design | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <p className="mt-2 text-zinc-600">
            Dit design bestaat niet (meer) in local storage. Tip: als je drafts auto-gepruned zijn door storage-limit,
            kan een oude link breken.
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
      </main>
    );
  }

  const preview =
    design.previewFrontDataUrl ||
    design.previewBackDataUrl ||
    design.artworkDataUrl ||
    null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="lg:max-w-xl">
            <p className="text-xs font-medium tracking-widest text-zinc-500">MARKETPLACE</p>
            <h1 className="mt-2 text-4xl font-semibold text-zinc-900">{design.title}</h1>
            <p className="mt-3 text-zinc-600">{design.prompt || "—"}</p>

            <div className="mt-6 flex flex-wrap gap-2 text-sm text-zinc-700">
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1">
                {design.productType === "hoodie" ? "Hoodie" : "T-shirt"}
              </span>
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1">
                Print: {design.printArea === "back" ? "Back" : "Front"}
              </span>
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border border-zinc-300" style={{ backgroundColor: design.selectedColor.hex }} />
                {design.selectedColor.name}
              </span>
            </div>

            <div className="mt-8 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-6 py-4">
              <div>
                <p className="text-xs text-zinc-500">Base price</p>
                <p className="text-lg font-semibold text-zinc-900">{eur(design.basePrice)}</p>
              </div>

              <button
                onClick={() => {
                  // simpele add-to-cart: jouw addToCart verwacht al een item-structuur
                  // (als jij in marketplace al een modal hebt, laat dat daar)
                  addToCart({
                    name: design.productType === "hoodie" ? "Hoodie" : "T-shirt",
                    price: design.basePrice,
                    quantity: 1,
                    color: design.selectedColor.name,
                    size: "M",
                    printArea: design.printArea === "back" ? "Back" : "Front",
                    designId: design.id,
                    previewDataUrl: design.previewFrontDataUrl || design.previewBackDataUrl || undefined,
                  } as any);
                }}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Add to cart
              </button>
            </div>

            <div className="mt-6">
              <Link href="/marketplace" className="text-sm text-zinc-600 hover:text-zinc-900">
                ← Back to marketplace
              </Link>
            </div>
          </div>

          <div className="lg:w-[420px]">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6">
              <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-zinc-50 flex items-center justify-center">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt={design.title}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <p className="text-sm text-zinc-500">No preview available</p>
                )}
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                Local-first demo: later vervangen we dit door echte product mockups + Printful.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}