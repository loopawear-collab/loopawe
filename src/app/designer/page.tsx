"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { addToCart } from "@/lib/cart";
import { createDraft, type ColorOption, type PrintArea, type ProductType } from "@/lib/designs";

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

function isImageDataUrl(v: string | null) {
  return typeof v === "string" && v.startsWith("data:image/");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function snapshotPrintBox(printArea: PrintArea) {
  return printArea === "Back"
    ? { x: 160, y: 160, w: 120, h: 150 }
    : { x: 170, y: 185, w: 100, h: 120 };
}

function livePrintBox(printArea: PrintArea) {
  return printArea === "Back"
    ? { x: 150, y: 155, w: 140, h: 170 }
    : { x: 160, y: 175, w: 120, h: 150 };
}

/**
 * xNorm,yNorm in [-1..1] (0=center)
 * scale in [0.5..2.0]
 */
function computePlacement(
  box: { x: number; y: number; w: number; h: number },
  xNorm: number,
  yNorm: number,
  scale: number
) {
  const s = clamp(scale, 0.5, 2.0);
  const xn = clamp(xNorm, -1, 1);
  const yn = clamp(yNorm, -1, 1);

  const base = Math.min(box.w, box.h) * 0.85;
  const w = base * s;
  const h = base * s;

  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;

  const maxOffsetX = Math.max(0, (box.w - w) / 2);
  const maxOffsetY = Math.max(0, (box.h - h) / 2);

  const x = cx - w / 2 + xn * maxOffsetX;
  const y = cy - h / 2 + yn * maxOffsetY;

  return { x, y, w, h };
}

function makePreviewDataUrl(opts: {
  productType: ProductType;
  baseHex: string;
  printArea: PrintArea;
  artworkDataUrl: string | null;
  xNorm: number;
  yNorm: number;
  scale: number;
}) {
  const { productType, baseHex, printArea, artworkDataUrl, xNorm, yNorm, scale } = opts;
  const isHoodie = productType === "hoodie";

  const box = snapshotPrintBox(printArea);
  const safeArtwork = isImageDataUrl(artworkDataUrl) ? artworkDataUrl : null;
  const place = computePlacement(box, xNorm, yNorm, scale);

  const artworkLayer = safeArtwork
    ? `
    <clipPath id="clip">
      <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="18"/>
    </clipPath>
    <image href="${safeArtwork}"
      x="${place.x}" y="${place.y}"
      width="${place.w}" height="${place.h}"
      preserveAspectRatio="xMidYMid meet"
      clip-path="url(#clip)"/>
  `.trim()
    : "";

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 440 520">
    <rect x="0" y="0" width="440" height="520" rx="28" fill="#FAFAFA"/>
    <ellipse cx="220" cy="478" rx="140" ry="18" fill="#000" opacity="0.06"/>

    ${
      isHoodie
        ? `
      <path d="M140 120 C140 65, 300 65, 300 120 C300 160, 280 185, 220 185 C160 185, 140 160, 140 120 Z"
        fill="${baseHex}" stroke="#111827" stroke-opacity="0.10"/>
      <path d="M120 170 C120 145, 150 130, 180 128 L260 128 C290 130, 320 145, 320 170
        L350 220 C360 240, 350 260, 330 265 L320 268 L320 455 C320 470, 308 482, 293 482
        L147 482 C132 482, 120 470, 120 455 L120 268 L110 265 C90 260, 80 240, 90 220 Z"
        fill="${baseHex}" stroke="#111827" stroke-opacity="0.10"/>
      <path d="M165 330 C165 312, 182 298, 200 298 L240 298 C258 298, 275 312, 275 330
        L275 365 C275 384, 260 398, 240 398 L200 398 C180 398, 165 384, 165 365 Z"
        fill="#000" opacity="0.05"/>
    `
        : `
      <path d="M135 155 L170 125 C185 112, 200 105, 220 105 C240 105, 255 112, 270 125
        L305 155 L350 205 C360 220, 355 242, 336 248 L320 253 L320 455
        C320 470, 308 482, 293 482 L147 482 C132 482, 120 470, 120 455
        L120 253 L104 248 C85 242, 80 220, 90 205 Z"
        fill="${baseHex}" stroke="#111827" stroke-opacity="0.10"/>
      <path d="M190 120 C195 135, 205 145, 220 145 C235 145, 245 135, 250 120"
        fill="none" stroke="#000" stroke-opacity="0.10" stroke-width="10" stroke-linecap="round"/>
    `
    }

    <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="18"
      fill="#FFFFFF" opacity="0.55" stroke="#111827" stroke-opacity="0.18" stroke-dasharray="7 7"/>

    ${artworkLayer}

    ${
      !safeArtwork
        ? `<text x="${box.x + box.w / 2}" y="${box.y + box.h / 2}"
          text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#111827" opacity="0.55"
          style="letter-spacing:0.25em">ART</text>`
        : ""
    }
  </svg>`.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function ApparelMockup(props: {
  productType: ProductType;
  baseHex: string;
  printArea: PrintArea;
  artworkDataUrl: string | null;
  xNorm: number;
  yNorm: number;
  scale: number;
}) {
  const { productType, baseHex, printArea, artworkDataUrl, xNorm, yNorm, scale } = props;
  const isHoodie = productType === "hoodie";
  const box = livePrintBox(printArea);

  const safeArtwork = isImageDataUrl(artworkDataUrl) ? artworkDataUrl : null;
  const place = computePlacement(box, xNorm, yNorm, scale);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-10">
      <div className="mx-auto w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-[0.35em] text-zinc-400">PREVIEW</p>
          <span className="text-xs font-medium text-zinc-600">{printArea}</span>
        </div>

        <svg viewBox="0 0 440 520" className="mt-6 h-[420px] w-full" role="img" aria-label="Product preview">
          <rect x="0" y="0" width="440" height="520" rx="28" fill="#FAFAFA" />
          <ellipse cx="220" cy="478" rx="140" ry="18" fill="#000" opacity="0.06" />

          {isHoodie ? (
            <>
              <path
                d="M140 120 C140 65, 300 65, 300 120 C300 160, 280 185, 220 185 C160 185, 140 160, 140 120 Z"
                fill={baseHex}
                stroke="#111827"
                strokeOpacity="0.10"
              />
              <path
                d="M120 170 C120 145, 150 130, 180 128 L260 128 C290 130, 320 145, 320 170
                   L350 220 C360 240, 350 260, 330 265 L320 268 L320 455 C320 470, 308 482, 293 482
                   L147 482 C132 482, 120 470, 120 455 L120 268 L110 265 C90 260, 80 240, 90 220 Z"
                fill={baseHex}
                stroke="#111827"
                strokeOpacity="0.10"
              />
              <path
                d="M165 330 C165 312, 182 298, 200 298 L240 298 C258 298, 275 312, 275 330
                   L275 365 C275 384, 260 398, 240 398 L200 398 C180 398, 165 384, 165 365 Z"
                fill="#000"
                opacity="0.05"
              />
            </>
          ) : (
            <>
              <path
                d="M135 155 L170 125 C185 112, 200 105, 220 105 C240 105, 255 112, 270 125
                   L305 155 L350 205 C360 220, 355 242, 336 248 L320 253 L320 455
                   C320 470, 308 482, 293 482 L147 482 C132 482, 120 470, 120 455
                   L120 253 L104 248 C85 242, 80 220, 90 205 Z"
                fill={baseHex}
                stroke="#111827"
                strokeOpacity="0.10"
              />
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

          <defs>
            <clipPath id="printClip">
              <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="18" />
            </clipPath>
          </defs>

          <rect
            x={box.x}
            y={box.y}
            width={box.w}
            height={box.h}
            rx="18"
            fill="#FFFFFF"
            opacity="0.55"
            stroke="#111827"
            strokeOpacity="0.18"
            strokeDasharray="7 7"
          />

          {safeArtwork ? (
            <image
              href={safeArtwork}
              x={place.x}
              y={place.y}
              width={place.w}
              height={place.h}
              preserveAspectRatio="xMidYMid meet"
              clipPath="url(#printClip)"
            />
          ) : (
            <text
              x={box.x + box.w / 2}
              y={box.y + box.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fill="#111827"
              opacity="0.55"
              style={{ letterSpacing: "0.25em" }}
            >
              ART
            </text>
          )}
        </svg>

        <p className="mt-4 text-xs text-zinc-500">Use sliders to position/scale. Next: drag with mouse.</p>
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

  const [selectedColor, setSelectedColor] = useState<ColorOption>(COLOR_PRESETS[2]);
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [qty, setQty] = useState(1);

  const [artworkDataUrl, setArtworkDataUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // sliders
  const [scale, setScale] = useState(1.0);
  const [xNorm, setXNorm] = useState(0.0);
  const [yNorm, setYNorm] = useState(0.0);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const basePrice = useMemo(() => (productType === "hoodie" ? 49.99 : 34.99), [productType]);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1400);
  }

  function resetPlacement() {
    setScale(1.0);
    setXNorm(0.0);
    setYNorm(0.0);
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
      const previewDataUrl = makePreviewDataUrl({
        productType,
        baseHex: selectedColor.hex,
        printArea,
        artworkDataUrl,
        xNorm,
        yNorm,
        scale,
      });

      const d = createDraft(user, {
        title: title.trim() || "Untitled design",
        prompt: prompt ?? "",
        productType,
        printArea,
        allowedColors: COLOR_PRESETS,
        previewDataUrl,
        baseColorName: selectedColor.name,
        baseColorHex: selectedColor.hex,
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

  function onPickFile() {
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      notify("Image too large (max 4MB)");
      e.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      notify("Please upload an image file");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!isImageDataUrl(result)) {
        notify("Could not read image");
        return;
      }
      setArtworkDataUrl(result);
      resetPlacement();
      notify("Image uploaded ✓");
    };
    reader.onerror = () => notify("Could not read image");
    reader.readAsDataURL(file);

    e.target.value = "";
  }

  function removeArtwork() {
    setArtworkDataUrl(null);
    resetPlacement();
    notify("Image removed");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-zinc-900">Designer</h1>
          <p className="mt-2 text-sm text-zinc-600">Upload image + position/scale (sliders). Next: drag with mouse.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/marketplace" className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
            Marketplace
          </Link>
          <Link href="/account" className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
            Account
          </Link>
          <Link href="/cart" className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
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
              <h2 className="mt-2 truncate text-2xl font-semibold text-zinc-900">{title || "Untitled design"}</h2>
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
            <ApparelMockup
              productType={productType}
              baseHex={selectedColor.hex}
              printArea={printArea}
              artworkDataUrl={artworkDataUrl}
              xNorm={xNorm}
              yNorm={yNorm}
              scale={scale}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button onClick={onAddToCart} className="w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
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
              <label className="text-xs font-semibold text-zinc-500">Prompt (AI later)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="mt-2 w-full min-h-[120px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder='Example: "Minimal line art tiger, high contrast, centered"'
              />
            </div>

            {/* Upload */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Upload image</p>
                  <p className="mt-1 text-xs text-zinc-500">PNG/JPG • max 4MB</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={onPickFile} className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800">
                    Upload
                  </button>
                  {artworkDataUrl ? (
                    <button onClick={removeArtwork} className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

              {artworkDataUrl ? (
                <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <img src={artworkDataUrl} alt="Uploaded artwork" className="h-40 w-full rounded-lg bg-white object-contain" />
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
                  No image uploaded yet.
                </div>
              )}
            </div>

            {/* Sliders */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Position & scale</p>
                  <p className="mt-1 text-xs text-zinc-500">Clamped inside print box</p>
                </div>
                <button onClick={resetPlacement} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50">
                  Reset
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500">Scale</span>
                    <span className="text-xs text-zinc-600">{scale.toFixed(2)}×</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.01}
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="mt-2 w-full"
                    disabled={!artworkDataUrl}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500">X</span>
                    <span className="text-xs text-zinc-600">{xNorm.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={xNorm}
                    onChange={(e) => setXNorm(Number(e.target.value))}
                    className="mt-2 w-full"
                    disabled={!artworkDataUrl}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500">Y</span>
                    <span className="text-xs text-zinc-600">{yNorm.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={yNorm}
                    onChange={(e) => setYNorm(Number(e.target.value))}
                    className="mt-2 w-full"
                    disabled={!artworkDataUrl}
                  />
                </div>

                {!artworkDataUrl ? <p className="text-xs text-zinc-500">Upload an image to enable sliders.</p> : null}
              </div>
            </div>

            {/* Options */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-500">Product</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["tshirt", "hoodie"] as ProductType[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setProductType(p)}
                      className={
                        "rounded-full px-4 py-2 text-sm font-semibold " +
                        (p === productType ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                      }
                    >
                      {p === "tshirt" ? "T-shirt" : "Hoodie"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500">Print area</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["Front", "Back"] as PrintArea[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setPrintArea(a)}
                      className={
                        "rounded-full px-4 py-2 text-sm font-semibold " +
                        (a === printArea ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                      }
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-500">Size</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={
                        "rounded-full px-4 py-2 text-sm font-semibold " +
                        (s === size ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500">Quantity</label>
                <div className="mt-2 inline-flex items-center rounded-full border border-zinc-200 bg-white">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="rounded-l-full px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
                    −
                  </button>
                  <div className="min-w-[56px] text-center text-sm font-semibold text-zinc-900">{qty}</div>
                  <button onClick={() => setQty((q) => q + 1)} className="rounded-r-full px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
                    +
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500">Color</label>
              <div className="mt-3 flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c)}
                    className={
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold " +
                      (c.name === selectedColor.name
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
                    }
                  >
                    <span className="h-3 w-3 rounded-full border border-zinc-200" style={{ backgroundColor: c.hex }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {!canSave ? <p className="text-xs text-zinc-500">Login required to save drafts.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}