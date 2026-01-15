"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { addToCart } from "@/lib/cart";
import { useCartUI } from "@/lib/cart-ui";

import {
  createDraft,
  togglePublish,
  type ColorOption,
  type ProductType,
  type PrintArea,
} from "@/lib/designs";

/**
 * Designer (local-first, preview-only)
 * - Upload image → compress thumbnail (prevents storage quota)
 * - Position + scale sliders
 * - Save draft → creates a draft in designs store
 * - Publish → sets status to published (marketplace)
 * - Add to cart → adds item and OPENS mini cart drawer
 *
 * NOTE: We intentionally removed IndexedDB imageStore calls (idbSaveImage/makeAssetKey)
 * because your current imageStore.ts exports don't match those names/args.
 * This keeps the project stable. We can re-introduce a consistent imageStore later.
 */

const SIZES = ["S", "M", "L", "XL", "XXXL"] as const;

const COLOR_PRESETS: ColorOption[] = [
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#0a0a0a" },
  { name: "Navy", hex: "#0B1B3B" },
  { name: "Sand", hex: "#E7DFC8" },
  { name: "Red", hex: "#C81D25" },
  { name: "Pink", hex: "#FF4D8D" },
  { name: "Purple", hex: "#7C3AED" },
  { name: "Green", hex: "#16A34A" },
];

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

function basePriceFor(productType: ProductType) {
  return productType === "hoodie" ? 49.99 : 34.99;
}

async function fileToDataUrl(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${file.type};base64,${btoa(binary)}`;
}

async function createThumbnail(dataUrl: string, maxSize = 520, quality = 0.78): Promise<string> {
  const img = new Image();
  img.src = dataUrl;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image load failed"));
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const scale = Math.min(1, maxSize / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.drawImage(img, 0, 0, cw, ch);
  return canvas.toDataURL("image/jpeg", quality);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function DesignerPage() {
  const router = useRouter();
  const { user, ready } = useAuth();

  // ✅ correct name from CartUI
  const { openMiniCart } = useCartUI();

  // Basic fields
  const [title, setTitle] = useState("Untitled design");
  const [prompt, setPrompt] = useState("");

  // Product config
  const [productType, setProductType] = useState<ProductType>("tshirt");
  const [printArea, setPrintArea] = useState<PrintArea>("front");
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [selectedColor, setSelectedColor] = useState<ColorOption>(COLOR_PRESETS[0]);

  // Artwork preview (compressed thumbnail)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  // Placement (sliders)
  const [imageX, setImageX] = useState(0);
  const [imageY, setImageY] = useState(0);
  const [imageScale, setImageScale] = useState(1);

  // Draft meta
  const [draftId, setDraftId] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ownerId = user?.id ?? user?.email ?? "local";
  const basePrice = useMemo(() => basePriceFor(productType), [productType]);

  function notify(msg: string) {
    setToast(msg);
    window.clearTimeout((notify as any)._t);
    (notify as any)._t = window.setTimeout(() => setToast(null), 2200);
  }

  async function onPickFile(file: File) {
    setBusy(true);
    try {
      const original = await fileToDataUrl(file);
      const thumb = await createThumbnail(original, 520, 0.78);
      setPreviewDataUrl(thumb);

      setImageX(0);
      setImageY(0);
      setImageScale(1);

      notify("Image uploaded ✓");
    } catch {
      notify("Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDraft() {
    if (!ready) return;
    setBusy(true);
    try {
      const input = {
        ownerId,
        title,
        prompt,
        productType,
        printArea,
        basePrice,
        selectedColor,
        allowedColors: COLOR_PRESETS,

        // ✅ preview-only snapshots (what marketplace uses)
        previewFrontDataUrl: printArea === "front" ? previewDataUrl ?? undefined : undefined,
        previewBackDataUrl: printArea === "back" ? previewDataUrl ?? undefined : undefined,

        // placement
        imageX,
        imageY,
        imageScale,
      };

      const created = createDraft(input as any);
      setDraftId(created.id);
      setStatus(created.status);

      notify("Draft saved ✓");
    } catch {
      notify("Draft saving failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    if (!draftId) {
      notify("Save draft first");
      return;
    }
    setBusy(true);
    try {
      const updated = togglePublish(draftId, true);
      if (updated) {
        setStatus("published");
        notify("Published ✓");
        router.push("/marketplace");
      } else {
        notify("Publish failed");
      }
    } finally {
      setBusy(false);
    }
  }

  function onAddToCart() {
    addToCart({
      name: productType === "hoodie" ? "Hoodie" : "T-shirt",
      price: basePrice,
      quantity: 1,
      color: selectedColor.name,
      size,
      printArea: printArea === "back" ? "Back" : "Front",
      previewDataUrl: previewDataUrl ?? undefined,
      designId: draftId ?? undefined,
      productType,
      colorHex: selectedColor.hex,
    } as any);

    notify("Added to cart ✓");
    openMiniCart(); // ✅ open drawer
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

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium tracking-widest text-zinc-500">DESIGNER</p>
            <h1 className="mt-2 text-4xl font-semibold text-zinc-900">Create a design</h1>
            <p className="mt-2 text-zinc-600">
              Local-first demo • <span className="font-medium text-zinc-900">{status}</span>
              {draftId ? <span className="text-zinc-500"> • {draftId}</span> : null}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/marketplace"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Marketplace
            </Link>
            <button
              type="button"
              onClick={() => openMiniCart()}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Cart
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* LEFT: Controls */}
          <section className="space-y-8">
            {/* Title + prompt */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <label className="text-xs font-medium tracking-widest text-zinc-500">TITLE</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Untitled design"
              />

              <label className="mt-5 block text-xs font-medium tracking-widest text-zinc-500">
                PROMPT (optional)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="mt-2 w-full min-h-[110px] rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Describe your design…"
              />
            </div>

            {/* Product */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <p className="text-xs font-medium tracking-widest text-zinc-500">PRODUCT</p>
              <div className="mt-3 inline-flex rounded-full border border-zinc-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setProductType("tshirt")}
                  className={
                    "rounded-full px-4 py-2 text-sm font-medium " +
                    (productType === "tshirt"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-50")
                  }
                >
                  T-shirt
                </button>
                <button
                  type="button"
                  onClick={() => setProductType("hoodie")}
                  className={
                    "rounded-full px-4 py-2 text-sm font-medium " +
                    (productType === "hoodie"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-50")
                  }
                >
                  Hoodie
                </button>
              </div>

              <p className="mt-3 text-sm text-zinc-600">Base price: {eur(basePrice)}</p>
            </div>

            {/* Size + print area */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium tracking-widest text-zinc-500">SIZE</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className={
                          "rounded-full border px-4 py-2 text-sm font-medium " +
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

                <div>
                  <p className="text-xs font-medium tracking-widest text-zinc-500">PRINT AREA</p>
                  <div className="mt-3 inline-flex rounded-full border border-zinc-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setPrintArea("front")}
                      className={
                        "rounded-full px-4 py-2 text-sm font-medium " +
                        (printArea === "front"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-700 hover:bg-zinc-50")
                      }
                    >
                      Front
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintArea("back")}
                      className={
                        "rounded-full px-4 py-2 text-sm font-medium " +
                        (printArea === "back"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-700 hover:bg-zinc-50")
                      }
                    >
                      Back
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Color */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <p className="text-xs font-medium tracking-widest text-zinc-500">COLOR</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={
                      "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium " +
                      (selectedColor.name === c.name
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                    }
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-zinc-300"
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <p className="text-xs font-medium tracking-widest text-zinc-500">ARTWORK</p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPickFile(f);
                    e.currentTarget.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  disabled={busy}
                >
                  Upload image
                </button>

                {previewDataUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDataUrl(null);
                      notify("Artwork removed");
                    }}
                    className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                    disabled={busy}
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                Upload wordt automatisch gecomprimeerd (sneller + voorkomt storage errors).
              </p>
            </div>

            {/* Transform */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <p className="text-xs font-medium tracking-widest text-zinc-500">POSITION &amp; SCALE</p>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>X</span>
                    <span>{Math.round(imageX)}px</span>
                  </div>
                  <input
                    type="range"
                    min={-160}
                    max={160}
                    value={imageX}
                    onChange={(e) => setImageX(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Y</span>
                    <span>{Math.round(imageY)}px</span>
                  </div>
                  <input
                    type="range"
                    min={-160}
                    max={160}
                    value={imageY}
                    onChange={(e) => setImageY(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Scale</span>
                    <span>{imageScale.toFixed(2)}×</span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={2.4}
                    step={0.01}
                    value={imageScale}
                    onChange={(e) => setImageScale(clamp(Number(e.target.value), 0.4, 2.4))}
                    className="mt-2 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onSaveDraft}
                className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                disabled={busy}
              >
                Save draft
              </button>

              <button
                type="button"
                onClick={onPublish}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                disabled={busy || !draftId}
              >
                Publish
              </button>

              <button
                type="button"
                onClick={onAddToCart}
                className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                disabled={busy}
              >
                Add to cart
              </button>
            </div>

            {toast ? (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                {toast}
              </div>
            ) : null}
          </section>

          {/* RIGHT: Preview */}
          <aside className="rounded-3xl border border-zinc-200 bg-white p-6">
            <p className="text-xs font-medium tracking-widest text-zinc-500">PREVIEW</p>

            <div className="mt-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="mx-auto w-full max-w-[420px]">
                <div
                  className="relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-3xl border border-zinc-200 bg-white"
                  style={{ backgroundColor: selectedColor.hex }}
                >
                  {/* Print area frame */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative h-[58%] w-[62%] rounded-2xl border border-zinc-900/10 bg-white/25" />
                  </div>

                  {/* Artwork */}
                  {previewDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewDataUrl}
                      alt="Artwork preview"
                      className="absolute left-1/2 top-1/2 select-none"
                      style={{
                        transform: `translate(calc(-50% + ${imageX}px), calc(-50% + ${imageY}px)) scale(${imageScale})`,
                        transformOrigin: "center",
                        maxWidth: "70%",
                        maxHeight: "70%",
                      }}
                      draggable={false}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-zinc-500">Upload an image to preview</p>
                    </div>
                  )}
                </div>

                <p className="mt-4 text-xs text-zinc-500">
                  Later maken we dit “true-to-life” met echte product mockups + Printful.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}