"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { addToCart } from "@/lib/cart";
import { useCartUI } from "@/lib/cart-ui";

import {
  createDraft,
  updateDesign,
  togglePublish,
  type ColorOption,
  type ProductType,
  type PrintArea,
} from "@/lib/designs";

import { idbSaveImage, makeAssetKey } from "@/lib/imageStore";

/**
 * DESIGNER (C1-1)
 * - Upload image:
 *    - ORIGINAL -> IndexedDB (artworkAssetKey)
 *    - THUMB -> state (preview) -> stored into design previews on save
 * - Save draft:
 *    - creates draft once, then updates same draftId
 * - Publish:
 *    - ONE-CLICK publish:
 *       if no draftId -> auto create draft -> then publish
 *       always updates latest payload first
 * - Add to cart:
 *    - adds item + opens mini cart
 */

const SIZES = ["S", "M", "L", "XL", "XXXL"] as const;
type Size = (typeof SIZES)[number];

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function uid(prefix = "ART") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
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

export default function DesignerPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { openMiniCart } = useCartUI();

  const ownerId = user?.id ?? user?.email ?? "local";

  // Basic
  const [title, setTitle] = useState("Untitled design");
  const [prompt, setPrompt] = useState("");

  // Product
  const [productType, setProductType] = useState<ProductType>("tshirt");
  const [printArea, setPrintArea] = useState<PrintArea>("front");
  const [size, setSize] = useState<Size>("M");
  const [selectedColor, setSelectedColor] = useState<ColorOption>(COLOR_PRESETS[0]);

  // Images
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null); // small snapshot
  const [artworkAssetKey, setArtworkAssetKey] = useState<string | null>(null); // IndexedDB key for original

  // Transform
  const [imageX, setImageX] = useState(0);
  const [imageY, setImageY] = useState(0);
  const [imageScale, setImageScale] = useState(1);

  // Draft
  const [draftId, setDraftId] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  // UI
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const basePrice = useMemo(() => basePriceFor(productType), [productType]);

  function notify(msg: string) {
    setToast(msg);
    window.clearTimeout((notify as any)._t);
    (notify as any)._t = window.setTimeout(() => setToast(null), 2200);
  }

  function buildPayload() {
    return {
      ownerId,
      title,
      prompt,
      productType,
      printArea,
      basePrice,

      selectedColor,
      allowedColors: COLOR_PRESETS,

      artworkAssetKey: artworkAssetKey ?? undefined,

      // previews only (marketplace-safe)
      previewFrontDataUrl: printArea === "front" ? previewDataUrl ?? undefined : undefined,
      previewBackDataUrl: printArea === "back" ? previewDataUrl ?? undefined : undefined,

      imageX,
      imageY,
      imageScale,
    };
  }

  async function onPickFile(file: File) {
    setBusy(true);
    setBusyLabel("Uploading…");
    try {
      const original = await fileToDataUrl(file);
      const thumb = await createThumbnail(original, 520, 0.78);

      // store original in IndexedDB
      const assetId = uid("ART");
      const key = makeAssetKey(assetId, "artwork");
      await idbSaveImage(key, original);

      setArtworkAssetKey(key);
      setPreviewDataUrl(thumb);

      setImageX(0);
      setImageY(0);
      setImageScale(1);

      notify("Image uploaded ✓");
    } catch {
      notify("Upload failed");
    } finally {
      setBusy(false);
      setBusyLabel(null);
    }
  }

  async function ensureDraftAndUpdate(): Promise<string | null> {
    // Ensures we have a draftId, and the latest payload is saved.
    const payload = buildPayload();

    if (!draftId) {
      const created = createDraft(payload as any);
      setDraftId(created.id);
      setStatus(created.status);
      return created.id;
    }

    const updated = updateDesign(draftId, payload as any);
    if (updated) {
      setStatus(updated.status);
      return updated.id;
    }
    return null;
  }

  async function onSaveDraft() {
    if (!ready) return;
    setBusy(true);
    setBusyLabel("Saving…");
    try {
      const id = await ensureDraftAndUpdate();
      if (id) {
        notify(draftId ? "Draft updated ✓" : "Draft saved ✓");
      } else {
        notify("Draft save failed");
      }
    } finally {
      setBusy(false);
      setBusyLabel(null);
    }
  }

  async function onPublish() {
    if (!ready) return;
    setBusy(true);
    setBusyLabel("Publishing…");
    try {
      // ✅ One-click publish:
      // 1) ensure draft exists (create if needed) and save latest payload
      const id = await ensureDraftAndUpdate();
      if (!id) {
        notify("Publish failed");
        return;
      }

      // 2) publish it
      const published = togglePublish(id, true);
      if (!published) {
        notify("Publish failed");
        return;
      }

      setDraftId(id);
      setStatus("published");
      notify("Published ✓");

      router.push("/marketplace");
    } finally {
      setBusy(false);
      setBusyLabel(null);
    }
  }

  function onAddToCart() {
    addToCart({
      name: productType === "hoodie" ? "Hoodie" : "T-shirt",
      productType,
      price: basePrice,
      quantity: 1,
      color: selectedColor.name,
      colorHex: selectedColor.hex,
      size,
      printArea: printArea === "back" ? "Back" : "Front",
      previewDataUrl: previewDataUrl ?? undefined,
      designId: draftId ?? undefined,
    } as any);

    notify("Added to cart ✓");
    openMiniCart();
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
          {/* LEFT */}
          <section className="space-y-8">
            {/* Title + prompt */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <label className="text-xs font-medium tracking-widest text-zinc-500">TITLE</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
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
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                  disabled={busy}
                >
                  {busy && busyLabel === "Uploading…" ? "Uploading…" : "Upload image"}
                </button>

                {previewDataUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDataUrl(null);
                      setArtworkAssetKey(null);
                      notify("Artwork removed");
                    }}
                    className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                    disabled={busy}
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="mt-3 text-xs text-zinc-500 space-y-1">
                <p>✔ Thumbnail stored in localStorage previews</p>
                <p>✔ Original stored in IndexedDB (key saved in draft)</p>
                {artworkAssetKey ? (
                  <p className="text-zinc-400">
                    Key: <span className="font-mono">{artworkAssetKey}</span>
                  </p>
                ) : null}
              </div>
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
                    disabled={busy}
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
                    disabled={busy}
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
                    disabled={busy}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onSaveDraft}
                className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                disabled={busy}
              >
                {busy && busyLabel === "Saving…" ? "Saving…" : draftId ? "Update draft" : "Save draft"}
              </button>

              <button
                type="button"
                onClick={onPublish}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                disabled={busy}
              >
                {busy && busyLabel === "Publishing…" ? "Publishing…" : "Publish"}
              </button>

              <button
                type="button"
                onClick={onAddToCart}
                className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
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
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative h-[58%] w-[62%] rounded-2xl border border-zinc-900/10 bg-white/25" />
                  </div>

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
                  One-click publish enabled: Publish will auto-save a draft first.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}