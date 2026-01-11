"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addToCart } from "@/lib/cart";

const COLORS = [
  { name: "White", value: "White" },
  { name: "Black", value: "Black" },
  { name: "Navy", value: "Navy" },
  { name: "Sand", value: "Sand" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
const PRINT_AREAS = ["Front", "Back"] as const;

export default function DesignerPage() {
  const [color, setColor] = useState(COLORS[0].value);
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [printArea, setPrintArea] = useState<(typeof PRINT_AREAS)[number]>("Front");
  const [quantity, setQuantity] = useState(1);

  // Later: dynamic pricing per product/color/size/provider (Printful etc.)
  const unitPrice = useMemo(() => 34.99, []);

  const canAdd = quantity >= 1;

  function handleAdd() {
    if (!canAdd) return;

    addToCart({
      name: "T-shirt",
      color,
      size,
      printArea,
      quantity,
      price: unitPrice, // ✅ BELANGRIJK: nooit undefined
    });

    // mini feedback
    alert("Toegevoegd aan winkelmand.");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Left: preview */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-zinc-900">Designer</h1>
            <Link
              href="/cart"
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Naar winkelmand
            </Link>
          </div>

          <div className="mt-8 rounded-3xl border border-zinc-200 bg-zinc-50 p-10">
            <div className="mx-auto h-[420px] max-w-[360px] rounded-3xl bg-white shadow-sm flex items-center justify-center">
              <div className="text-center">
                <div className="text-xs tracking-[0.4em] text-zinc-400">LOOPA</div>
                <div className="mt-2 text-2xl font-semibold text-zinc-900">T-shirt</div>
                <div className="mt-3 text-sm text-zinc-600">
                  {color} • {size} • {printArea}
                </div>
                <div className="mt-6 text-sm text-zinc-500">
                  Preview is placeholder — later komt hier je mockup + AI design.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm">
            <div className="text-zinc-600">Prijs per stuk</div>
            <div className="font-semibold text-zinc-900">€ {unitPrice.toFixed(2)}</div>
          </div>
        </section>

        {/* Right: controls */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Instellingen</h2>

          <div className="mt-6 grid grid-cols-1 gap-5">
            <div>
              <label className="text-sm text-zinc-600">Kleur</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COLORS.map((c) => {
                  const active = c.value === color;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={
                        "rounded-full px-4 py-2 text-sm font-medium transition " +
                        (active
                          ? "bg-zinc-900 text-white"
                          : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                      }
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-600">Maat</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SIZES.map((s) => {
                  const active = s === size;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={
                        "rounded-full px-4 py-2 text-sm font-medium transition " +
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

            <div>
              <label className="text-sm text-zinc-600">Print area</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRINT_AREAS.map((p) => {
                  const active = p === printArea;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrintArea(p)}
                      className={
                        "rounded-full px-4 py-2 text-sm font-medium transition " +
                        (active
                          ? "bg-zinc-900 text-white"
                          : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                      }
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-600">Aantal</label>
              <div className="mt-2 inline-flex items-center rounded-full border border-zinc-200 bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 rounded-l-full"
                >
                  −
                </button>
                <div className="min-w-[48px] text-center text-sm font-medium text-zinc-900">
                  {quantity}
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 rounded-r-full"
                >
                  +
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!canAdd}
                className="w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Voeg toe aan winkelmand
              </button>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link
                  href="/cart"
                  className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Ga naar winkelmand
                </Link>
                <Link
                  href="/designer"
                  className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Maak nog een ontwerp
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}