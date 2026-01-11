"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { listPublishedDesigns, type Design } from "@/lib/designs";
import { addToCart } from "@/lib/cart";

function eur(value: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(value);
}

function getDesignPrice(d: any): number {
  // Super-safe: we accepteren meerdere mogelijke velden om NaN te vermijden
  const candidate =
    d?.price ??
    d?.basePrice ??
    d?.pricing?.price ??
    d?.pricing?.basePrice ??
    d?.product?.price;

  const n = Number(candidate);
  return Number.isFinite(n) && n > 0 ? n : 34.99; // fallback demo prijs
}

export default function MarketplacePage() {
  const router = useRouter();

  // ✅ Hydration fix: server rendert altijd dezelfde UI, data komt pas client-side
  const [mounted, setMounted] = useState(false);
  const [designs, setDesigns] = useState<Design[]>([]);

  useEffect(() => {
    setMounted(true);

    // localStorage-only: pas lezen in useEffect
    try {
      const items = listPublishedDesigns();
      setDesigns(items ?? []);
    } catch {
      setDesigns([]);
    }
  }, []);

  const countText = useMemo(() => {
    if (!mounted) return "—"; // voorkomt mismatch server/client
    const n = designs.length;
    return `${n} ${n === 1 ? "design" : "designs"}`;
  }, [mounted, designs.length]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Marketplace</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Published designs (local-first) • <span className="font-medium text-zinc-900">{countText}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
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

        {/* Content */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          {/* Loading state (alleen client) */}
          {!mounted ? (
            <div className="space-y-4">
              <div className="h-6 w-40 rounded bg-zinc-100" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="h-28 rounded-2xl border border-zinc-200 bg-zinc-50" />
                <div className="h-28 rounded-2xl border border-zinc-200 bg-zinc-50" />
              </div>
            </div>
          ) : designs.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8">
              <h2 className="text-lg font-semibold text-zinc-900">Nog geen designs</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Publish een design vanuit de designer en je ziet ‘m hier verschijnen.
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {designs.map((d: any) => {
                const price = getDesignPrice(d);

                // super-safe labels
                const title = (d?.title ?? "Untitled design") as string;
                const productType = (d?.productType ?? d?.product?.type ?? "tshirt") as string;
                const printArea = (d?.printArea ?? d?.product?.printArea ?? "Front") as string;

                return (
                  <div
                    key={String(d?.id ?? title)}
                    className="rounded-2xl border border-zinc-200 bg-white p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-zinc-500">LOOPA</p>
                        <h3 className="mt-1 text-lg font-semibold text-zinc-900">{title}</h3>
                        <p className="mt-1 text-sm text-zinc-600">
                          {productType} • {printArea}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-zinc-500">From</p>
                        <p className="text-lg font-semibold text-zinc-900">{eur(price)}</p>
                      </div>
                    </div>

                    {d?.prompt ? (
                      <p className="mt-4 line-clamp-2 text-sm text-zinc-600">{String(d.prompt)}</p>
                    ) : null}

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          // addToCart verwacht bij jou al de juiste shape (zoals in designer/cart)
                          addToCart({
                            name: "T-shirt",
                            color: "White",
                            size: "M",
                            printArea: "Front",
                            price,
                            quantity: 1,
                            // extra info voor later:
                            designId: d?.id,
                            designTitle: title,
                          } as any);

                          router.push("/cart");
                        }}
                        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                      >
                        Add to cart
                      </button>

                      <Link
                        href="/designer"
                        className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                      >
                        Open in designer
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-8 text-xs text-zinc-500">
            Tip: later gaan we published designs uit localStorage naar DB (Prisma) syncen.
          </p>
        </div>
      </div>
    </main>
  );
}