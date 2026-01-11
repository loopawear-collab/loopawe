"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { addToCart } from "@/lib/cart";
import { createDraft, type ProductType, type PrintArea, type ColorOption } from "@/lib/designs";

const SIZES = ["S", "M", "L", "XL", "XXXL"] as const;

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

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

/** Simple SVG mockup (no external images needed) */
function ApparelMockup({
  productType,
  baseHex,
  printArea,
}: {
  productType: ProductType;
  baseHex: string;
  printArea: PrintArea;
}) {
  // Print box position differs front/back
  const printBox = printArea === "Back"
    ? { x: 150, y: 155, w: 140, h: 170 } // back: a bit higher/wider
    : { x: 160, y: 175, w: 120, h: 150 }; // front

  // Hoodie vs tshirt silhouette
  const isHoodie = productType === "hoodie";

  return (
    <div className="relative">
      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-10">
        <div className="mx-auto w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-[0.35em] text-zinc-400">PREVIEW</p>
            <span className="text-xs font-medium text-zinc-600">{printArea}</span>
          </div>

          <svg
            viewBox="0 0 440 520"
            className="mt-6 h-[420px] w-full"
            role="img"
            aria-label="Product mockup preview"
          >
            {/* subtle background */}
            <rect x="0" y="0" width="440" height="520" rx="28" fill="#FAFAFA" />

            {/* Shadow */}
            <ellipse cx="220" cy="478" rx="140" ry="18" fill="#000000" opacity="0.06" />

            {/* Apparel body */}
            {isHoodie ? (
              <>
                {/* Hood */}
                <path
                  d="M140 120 C140 65, 300 65, 300 120 C300 160, 280 185, 220 185 C160 185, 140 160, 140 120 Z"
                  fill={baseHex}
                  stroke="#111827"
                  strokeOpacity="0.10"
                />
                {/* Body */}
                <path
                  d="M120 170 C120 145, 150 130, 180 128 L260 128 C290 130, 320 145, 320 170
                     L350 220 C360 240, 350 260, 330 265 L320 268 L320 455 C320 470, 308 482, 293 482
                     L147 482 C132 482, 120 470, 120 455 L120 268 L110 265 C90 260, 80 240, 90 220 Z"
                  fill={baseHex}
                  stroke="#111827"
                  strokeOpacity="0.10"
                />
                {/* Pocket */}
                <path
                  d="M165 330 C165 312, 182 298, 200 298 L240 298 C258 298, 275 312, 275 330
                     L275 365 C275 384, 260 398, 240 398 L200 398 C180 398, 165 384, 165 365 Z"
                  fill="#000"
                  opacity="0.05"
                />
                {/* Strings */}
                <path d="M205 190 L205 255" stroke="#000" strokeOpacity="0.12" strokeWidth="6" strokeLinecap="round" />
                <path d="M235 190 L235 255" stroke="#000" strokeOpacity="0.12" strokeWidth="6" strokeLinecap="round" />
              </>
            ) : (
              <>
                {/* T-shirt */}
                <path
                  d="M135 155 L170 125 C185 112, 200 105, 220 105 C240 105, 255 112, 270 125
                     L305 155 L350 205 C360 220, 355 242, 336 248 L320 253 L320 455
                     C320 470, 308 482, 293 482 L147 482 C132 482, 120 470, 120 455
                     L120 253 L104 248 C85 242, 80 220, 90 205 Z"
                  fill={baseHex}
                  stroke="#111827"
                  strokeOpacity="0.10"
                />
                {/* Collar */}
                <path
                  d="M190 120 C195 135, 205 145, 220 145 C235 145, 245 135, 250 120"
                  fill="none"
                  stroke="#000"
                  strokeOpacity="0.10"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Print area box */}
            <rect
              x={printBox.x}
              y={printBox.y}
              width={printBox.w}
              height={printBox.h}
              rx="18"
              fill="#FFFFFF"
              opacity="0.55"
              stroke="#111827"
              strokeOpacity="0.18"
              strokeDasharray="7 7"
            />
            <text
              x={printBox.x + printBox.w / 2}
              y={printBox.y + printBox.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fill="#111827"
              opacity="0.55"
              style={{ letterSpacing: "0.25em" }}
            >
              ART
            </text>

            {/* Bottom highlight */}
            <path
              d="M135 455 C165 468, 275 468, 305 455"
              fill="none"
              stroke="#000"
              strokeOpacity="0.06"
              strokeWidth="10"
              strokeLinecap="round"
            />
          </svg>

          <p className="mt-4 text-xs text-zinc-500">
            Next: echte mockup + AI image overlay (drag/resize).
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DesignerPage() {
  const router = useRouter();
  const { user, ready } = useAuth();

  const [title, setTitle] = useState("Untitled design");
  const [prompt, setPrompt] = useState("");

  const [productType, setProductType] = useState<ProductType>("tshirt");
  const [printArea, setPrintArea] = useState<PrintArea>("Front");

  const [selectedColor, setSelectedColor] = useState<ColorOption>(COLOR_PRESETS[2]); // Navy default
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [qty, setQty] = useState(1);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const basePrice = useMemo(() => (productType === "hoodie" ? 49.99 : 34.99), [productType]);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1200);
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <p className="text-sm text-zinc-600">Loading…</p>
        </div>
      </main>
    );
  }

  const canSave = Boolean(user?.id || user?.email);

  async function onSaveDraft() {
    if (!canSave) {
      notify("Login required");
      router.push("/login");
      return;
    }

    setSaving(true);
    try {
      const d = createDraft(user, {
        title: title.trim() || "Untitled design",
        prompt: prompt ?? "",
        productType,
        printArea,
        // Store full palette for marketplace filtering later (creator can restrict later)
        allowedColors: COLOR_PRESETS,
      });

      if (!d) {
        notify("Could not save draft");
        return;
      }

      notify("Saved draft ✓");
      router.push("/account");
    } finally {
      setSaving(false);
    }
  }

  function onAddToCart() {
    addToCart({
      name: productType === "hoodie" ? "Hoodie" : "T-shirt",
      color: selectedColor.name,
      size,
      printArea,
      price: basePrice,
      quantity: qty,
    } as any);

    notify("Added to cart ✓");
    router.push("/cart");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-zinc-900">Designer</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Premium preview now. Next we’ll add AI image overlay + drag/resize.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/marketplace"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Marketplace
          </Link>
          <Link
            href="/account"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Account
          </Link>
          <Link
            href="/cart"
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Cart
          </Link>
        </div>
      </div>

      {toast ? (
        <div className="mt-6 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white">
          {toast}
        </div>
      ) : null}

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* LEFT: Preview */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.35em] text-zinc-400">LOOPA</p>
              <h2 className="mt-2 truncate text-2xl font-semibold text-zinc-900">
                {title || "Untitled design"}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                {productType === "hoodie" ? "Hoodie" : "T-shirt"} • {printArea} • {selectedColor.name}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-zinc-500">Price</p>
              <p className="text-lg font-semibold text-zinc-900">{eur(basePrice)}</p>
            </div>
          </div>

          <div className="mt-8">
            <ApparelMockup productType={productType} baseHex={selectedColor.hex} printArea={printArea} />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onAddToCart}
              className="w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Add to cart
            </button>
            <button
              onClick={onSaveDraft}
              disabled={saving}
              className="w-full rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
          </div>

          {!canSave ? (
            <p className="mt-4 text-xs text-zinc-500">
              You’re not logged in. Login is required to save drafts.
            </p>
          ) : null}
        </section>

        {/* RIGHT: Controls */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="grid gap-6">
            <div>
              <label className="text-xs font-semibold text-zinc-500">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500">Prompt (AI later)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Example: "Minimal line art tiger, high contrast, centered"'
                className="mt-2 w-full min-h-[120px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-500">Product</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["tshirt", "hoodie"] as ProductType[]).map((p) => {
                    const active = p === productType;
                    return (
                      <button
                        key={p}
                        onClick={() => setProductType(p)}
                        className={
                          "rounded-full px-4 py-2 text-sm font-semibold " +
                          (active ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                        }
                      >
                        {p === "tshirt" ? "T-shirt" : "Hoodie"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500">Print area</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["Front", "Back"] as PrintArea[]).map((a) => {
                    const active = a === printArea;
                    return (
                      <button
                        key={a}
                        onClick={() => setPrintArea(a)}
                        className={
                          "rounded-full px-4 py-2 text-sm font-semibold " +
                          (active ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                        }
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-500">Size</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SIZES.map((s) => {
                    const active = s === size;
                    return (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={
                          "rounded-full px-4 py-2 text-sm font-semibold " +
                          (active ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                        }
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500">Quantity</label>
                <div className="mt-2 inline-flex items-center rounded-full border border-zinc-200 bg-white">
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
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500">Color</label>
              <div className="mt-3 flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => {
                  const active = c.name === selectedColor.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c)}
                      className={
                        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold " +
                        (active ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                      }
                    >
                      <span className="h-3 w-3 rounded-full border border-zinc-200" style={{ backgroundColor: c.hex }} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Later koppelen we dit aan Printful kleur-varianten (alle echte kleuren).
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}