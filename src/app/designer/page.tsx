// src/app/designer/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { addToCart } from "@/lib/cart";
import { createDraft, togglePublish, type ColorOption, type ProductType, type PrintArea } from "@/lib/designs";
import { idbSetString, makeAssetKey } from "@/lib/imageStore";

const SIZES = ["S", "M", "L", "XL", "XXXL"] as const;

const COLOR_PRESETS: ColorOption[] = [
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#0a0a0a" },
  { name: "Navy", hex: "#0b1f3b" },
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

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("FileReader error"));
    r.readAsDataURL(file);
  });
}

async function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
  return img;
}

/**
 * Make a small thumbnail dataURL (JPEG) for marketplace/localStorage.
 * This is intentionally small to stay under localStorage limits.
 */
async function makeThumbnail(dataUrl: string, maxSize = 520, quality = 0.78): Promise<string> {
  const img = await dataUrlToImage(dataUrl);
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

  const [title, setTitle] = useState("Untitled design");
  const [prompt, setPrompt] = useState("");

  const [productType, setProductType] = useState<ProductType>("tshirt");
  const [printArea, setPrintArea] = useState<PrintArea>("front");
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");

  const [selectedColor, setSelectedColor] = useState<ColorOption>(COLOR_PRESETS[2]);

  // Artwork state (for live preview)
  const [artworkDataUrl, setArtworkDataUrl] = useState<string | null>(null);
  // Where the artwork is stored (IndexedDB key)
  const [artworkAssetKey, setArtworkAssetKey] = useState<string | null>(null);

  // Placement (simple sliders - can keep your drag version later)
  const [imageX, setImageX] = useState(0);
  const [imageY, setImageY] = useState(0);
  const [imageScale, setImageScale] = useState(1);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const basePrice = useMemo(() => (productType === "hoodie" ? 49.99 : 34.99), [productType]);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1400);
  }

  function resetPlacement() {
    setImageX(0);
    setImageY(0);
    setImageScale(1);
  }

  async function onPickFile(file: File | null) {
    if (!file) return;

    // Safety: keep it reasonable
    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      notify("Image too large (max 8MB)");
      return;
    }
    if (!file.type.startsWith("image/")) {
      notify("Please upload an image file");
      return;
    }

    setBusy(true);
    notify("Uploading…");

    try {
      // 1) Read original dataUrl (used for live view this session)
      const full = await fileToDataUrl(file);
      setArtworkDataUrl(full);

      // 2) Store full image in IndexedDB under a temporary key
      // We don’t have a designId yet, so we use a temp key and later re-save using designId.
      const tempKey = `temp:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      await idbSetString(tempKey, full);
      setArtworkAssetKey(tempKey);

      resetPlacement();
      notify("Image uploaded ✓");
    } catch {
      notify("Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDraft() {
    if (!user?.id) {
      router.push("/login");
      return;
    }

    setBusy(true);
    notify("Saving…");

    try {
      // We create the design first (gets an ID), then move artwork into a stable assetKey.
      const ownerId = user.id;

      // Create a tiny thumbnail for marketplace (from current artworkDataUrl)
      const thumb =
        artworkDataUrl ? await makeThumbnail(artworkDataUrl, 520, 0.78) : undefined;

      const draft = createDraft({
        ownerId,
        title: title.trim() || "Untitled design",
        prompt: prompt ?? "",

        productType,
        printArea,

        basePrice,

        selectedColor,
        allowedColors: COLOR_PRESETS,

        artworkAssetKey: undefined,
        previewFrontDataUrl: printArea === "front" ? thumb : undefined,
        previewBackDataUrl: printArea === "back" ? thumb : undefined,

        imageX,
        imageY,
        imageScale,
      });

      // If we have artwork, re-store it in IndexedDB using a stable key tied to the design id
      if (artworkAssetKey && artworkDataUrl) {
        const stableKey = makeAssetKey(draft.id, "artwork");
        await idbSetString(stableKey, artworkDataUrl);

        // Update draft to point to stableKey
        // (design metadata stays small; image stays in IDB)
        // We keep thumbnails in localStorage for marketplace.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { updateDesign } = require("@/lib/designs") as typeof import("@/lib/designs");
        updateDesign(draft.id, { artworkAssetKey: stableKey });
      }

      notify("Draft saved ✓");
      router.push("/account");
    } catch (e: any) {
      notify("Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    if (!user?.id) {
      router.push("/login");
      return;
    }

    setBusy(true);
    notify("Publishing…");

    try {
      // Save draft first (so publish always has a design to toggle)
      // Same logic as Save Draft but we stay here and then publish.
      const ownerId = user.id;

      const thumb =
        artworkDataUrl ? await makeThumbnail(artworkDataUrl, 520, 0.78) : undefined;

      const draft = createDraft({
        ownerId,
        title: title.trim() || "Untitled design",
        prompt: prompt ?? "",

        productType,
        printArea,

        basePrice,

        selectedColor,
        allowedColors: COLOR_PRESETS,

        artworkAssetKey: undefined,
        previewFrontDataUrl: printArea === "front" ? thumb : undefined,
        previewBackDataUrl: printArea === "back" ? thumb : undefined,

        imageX,
        imageY,
        imageScale,
      });

      if (artworkAssetKey && artworkDataUrl) {
        const stableKey = makeAssetKey(draft.id, "artwork");
        await idbSetString(stableKey, artworkDataUrl);

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { updateDesign } = require("@/lib/designs") as typeof import("@/lib/designs");
        updateDesign(draft.id, { artworkAssetKey: stableKey });
      }

      togglePublish(draft.id, true);

      notify("Published ✓");
      router.push("/marketplace");
    } catch {
      notify("Publish failed");
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
      previewDataUrl: undefined,
    } as any);

    notify("Added to cart ✓");
    router.push("/cart");
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

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-semibold text-zinc-900">Designer</h1>
          <p className="mt-2 text-zinc-600">Log in om designs te saven/publishen.</p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/login"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Login
            </Link>
            <Link
              href="/"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-zinc-900">Designer</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Images are stored in IndexedDB (safe). Marketplace uses thumbnails (fast).
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/marketplace" className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50">
            Marketplace
          </Link>
          <Link href="/account" className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50">
            Account
          </Link>
          <Link href="/cart" className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800">
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
        {/* Preview */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.35em] text-zinc-400">LOOPA</p>
              <h2 className="mt-2 truncate text-2xl font-semibold text-zinc-900">{title}</h2>
              <p className="mt-2 text-sm text-zinc-600">
                {productType === "hoodie" ? "Hoodie" : "T-shirt"} • {printArea} • {selectedColor.name}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-zinc-500">Price</p>
              <p className="text-lg font-semibold text-zinc-900">{eur(basePrice)}</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-zinc-200 bg-zinc-50 p-8">
            <div
              className="mx-auto relative rounded-3xl border border-zinc-200 bg-white shadow-sm"
              style={{ width: 420, height: 520 }}
            >
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[44px] border border-zinc-200"
                style={{ width: 320, height: 420, background: selectedColor.hex }}
              />

              <div
                className="absolute left-1/2 -translate-x-1/2 rounded-3xl border border-zinc-200 bg-black/5"
                style={{
                  top: printArea === "front" ? 155 : 175,
                  width: 220,
                  height: 260,
                }}
              />

              {artworkDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artworkDataUrl}
                  alt="artwork"
                  className="absolute left-1/2 top-1/2 select-none"
                  style={{
                    width: 220,
                    height: 220,
                    objectFit: "contain",
                    transform: `translate(calc(-50% + ${imageX}px), calc(-50% + ${imageY}px)) scale(${imageScale})`,
                    filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.18))",
                  }}
                />
              ) : (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-sm font-medium text-zinc-700">Upload an image</p>
                  <p className="mt-1 text-xs text-zinc-500">Your artwork will show here.</p>
                </div>
              )}
            </div>
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
              disabled={busy}
              className="w-full rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              onClick={onPublish}
              disabled={busy}
              className="w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              Publish
            </button>
          </div>
        </section>

        {/* Controls */}
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
              <label className="text-xs font-semibold text-zinc-500">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="mt-2 w-full min-h-[120px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Upload image</p>
                  <p className="mt-1 text-xs text-zinc-500">Stored in IndexedDB (safe)</p>
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  Upload
                </button>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />

              {artworkDataUrl ? (
                <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={artworkDataUrl} alt="Uploaded" className="h-40 w-full rounded-lg bg-white object-contain" />
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
                  No image uploaded yet.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Position & scale</p>
                  <p className="mt-1 text-xs text-zinc-500">Saved in design metadata</p>
                </div>
                <button
                  onClick={resetPlacement}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  Reset
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500">X</span>
                    <span className="text-xs text-zinc-600">{imageX}px</span>
                  </div>
                  <input
                    type="range"
                    min={-140}
                    max={140}
                    step={1}
                    value={imageX}
                    onChange={(e) => setImageX(Number(e.target.value))}
                    className="mt-2 w-full"
                    disabled={!artworkDataUrl}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500">Y</span>
                    <span className="text-xs text-zinc-600">{imageY}px</span>
                  </div>
                  <input
                    type="range"
                    min={-170}
                    max={170}
                    step={1}
                    value={imageY}
                    onChange={(e) => setImageY(Number(e.target.value))}
                    className="mt-2 w-full"
                    disabled={!artworkDataUrl}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500">Scale</span>
                    <span className="text-xs text-zinc-600">{imageScale.toFixed(2)}×</span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={2.2}
                    step={0.01}
                    value={imageScale}
                    onChange={(e) => setImageScale(Number(e.target.value))}
                    className="mt-2 w-full"
                    disabled={!artworkDataUrl}
                  />
                </div>

                {!artworkDataUrl ? (
                  <p className="text-xs text-zinc-500">Upload an image to enable sliders.</p>
                ) : null}
              </div>
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
                          (active
                            ? "bg-zinc-900 text-white"
                            : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
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
                  {(["front", "back"] as PrintArea[]).map((a) => {
                    const active = a === printArea;
                    return (
                      <button
                        key={a}
                        onClick={() => setPrintArea(a)}
                        className={
                          "rounded-full px-4 py-2 text-sm font-semibold " +
                          (active
                            ? "bg-zinc-900 text-white"
                            : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                        }
                      >
                        {a === "front" ? "Front" : "Back"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

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
                        (active
                          ? "bg-zinc-900 text-white"
                          : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                      }
                    >
                      <span className="h-3 w-3 rounded-full border border-zinc-200" style={{ backgroundColor: c.hex }} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}