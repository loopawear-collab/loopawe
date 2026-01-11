"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { addToCart } from "@/lib/cart";
import {
  createDraft,
  type ProductType,
  type PrintArea,
  type ColorOption,
} from "@/lib/designs";

const COLOR_PRESETS: ColorOption[] = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#0A0A0A" },
  { name: "Navy", hex: "#0B1F3B" },
  { name: "Sand", hex: "#E7DFC8" },
  { name: "Red", hex: "#C81D25" },
  { name: "Pink", hex: "#FF4D8D" },
  { name: "Purple", hex: "#7C3AED" },
  { name: "Green", hex: "#16A34A" },
];

const SIZES = ["S", "M", "L", "XL", "XXXL"] as const;

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

export default function DesignerPage() {
  const router = useRouter();
  const { user, ready } = useAuth();

  const [title, setTitle] = useState("Untitled design");
  const [prompt, setPrompt] = useState("");
  const [productType, setProductType] = useState<ProductType>("tshirt");
  const [printArea, setPrintArea] = useState<PrintArea>("Front");
  const [color, setColor] = useState<ColorOption>(COLOR_PRESETS[0]);
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [saving, setSaving] = useState(false);

  const basePrice = useMemo(() => {
    return productType === "hoodie" ? 49.99 : 34.99;
  }, [productType]);

  if (!ready) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <p className="text-sm text-zinc-600">Loading…</p>
        </div>
      </main>
    );
  }

  const canUse = Boolean(user?.email || user?.id);

  async function onSaveDraft() {
    if (!canUse) {
      router.push("/login");
      return;
    }
    setSaving(true);
    try {
      const d = createDraft(user, {
        title,
        prompt,
        productType,
        printArea,
        allowedColors: COLOR_PRESETS, // zodat Account “allowedColors” altijd heeft
      });

      if (!d) {
        alert("Draft kon niet opgeslagen worden (geen user).");
        return;
      }

      // Na save: ga direct naar account zodat je het meteen ziet
      router.push("/account");
    } finally {
      setSaving(false);
    }
  }

  function onAddToCart() {
    addToCart({
      name: productType === "hoodie" ? "Hoodie" : "T-shirt",
      color: color.name,
      size,
      printArea,
      price: basePrice,
      quantity: 1,
    });
    router.push("/cart");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-zinc-900">Designer</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Maak een design, sla op als draft, of voeg toe aan je cart.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onSaveDraft}
              disabled={saving}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button
              onClick={onAddToCart}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Add to cart ({eur(basePrice)})
            </button>
          </div>
        </div>

        {!canUse ? (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
            <p className="text-sm text-zinc-700">
              Je bent niet ingelogd. Log in om drafts te kunnen opslaan.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Naar login
            </button>
          </div>
        ) : null}

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-200 p-6">
              <label className="text-sm font-medium text-zinc-900">Titel</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              />

              <label className="mt-6 block text-sm font-medium text-zinc-900">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder='Bijv: "Minimal black & white line art tiger"'
              />
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Product</h2>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setProductType("tshirt")}
                  className={
                    "rounded-xl border px-3 py-2 text-sm " +
                    (productType === "tshirt"
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                  }
                >
                  T-shirt
                </button>
                <button
                  onClick={() => setProductType("hoodie")}
                  className={
                    "rounded-xl border px-3 py-2 text-sm " +
                    (productType === "hoodie"
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                  }
                >
                  Hoodie
                </button>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-zinc-900">
                  Print area
                </label>
                <select
                  value={printArea}
                  onChange={(e) => setPrintArea(e.target.value as PrintArea)}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="Front">Front</option>
                  <option value="Back">Back</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-zinc-900">Size</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as any)}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  {SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-zinc-900">Color</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setColor(c)}
                      className={
                        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm " +
                        (color.name === c.name
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                      }
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-zinc-200"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-5 text-xs text-zinc-500">
                Drafts worden lokaal opgeslagen (localStorage). Later koppelen we dit aan DB.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}