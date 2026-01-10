"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ProductType = "tshirt" | "hoodie";
type PrintArea = "front" | "back" | "both";
type Size = "S" | "M" | "L" | "XL" | "XXXL";

type CartItem = {
  id: string;
  createdAt: number;

  productType: ProductType;
  colorName: string;
  colorHex: string;
  size: Size;
  quantity: number;

  printArea: PrintArea;
  unitPrice: number;

  // Design image (upload now, AI later)
  designDataUrl: string | null;
  designScale: number; // 0.5 - 1.5
  designX: number; // -120..120 px
  designY: number; // -160..160 px
};

const CART_KEY = "loopa_cart_v1";

function money(n: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

const COLORS: Array<{ name: string; hex: string }> = [
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#0b0b0f" },
  { name: "Navy", hex: "#0b1f3a" },
  { name: "Sand", hex: "#e9dfc9" },
  { name: "Heather Grey", hex: "#c9c9c9" },
  { name: "Burgundy", hex: "#5b1b26" },
];

const SIZES: Size[] = ["S", "M", "L", "XL", "XXXL"];

const BASE_PRICES: Record<ProductType, number> = {
  tshirt: 34.99,
  hoodie: 49.99,
};

function printAreaAddon(area: PrintArea) {
  if (area === "front") return 0;
  if (area === "back") return 3.5;
  return 6.0; // both
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function DesignerPage() {
  const router = useRouter();

  // Product
  const [productType, setProductType] = useState<ProductType>("tshirt");
  const [colorName, setColorName] = useState(COLORS[0].name);
  const [colorHex, setColorHex] = useState(COLORS[0].hex);
  const [size, setSize] = useState<Size>("M");
  const [quantity, setQuantity] = useState<number>(1);

  // Print
  const [printArea, setPrintArea] = useState<PrintArea>("front");

  // Design image (upload)
  const [designDataUrl, setDesignDataUrl] = useState<string | null>(null);

  // Transform (move/scale)
  const [designScale, setDesignScale] = useState<number>(1);
  const [designX, setDesignX] = useState<number>(0);
  const [designY, setDesignY] = useState<number>(0);

  // UX feedback
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Dragging
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  // Derived price
  const unitPrice = useMemo(() => {
    const base = BASE_PRICES[productType];
    const addon = printAreaAddon(printArea);
    // later: POD pricing + your margin rules
    return Math.round((base + addon) * 100) / 100;
  }, [productType, printArea]);

  const subtotal = useMemo(() => {
    const s = unitPrice * quantity;
    return Math.round(s * 100) / 100;
  }, [unitPrice, quantity]);

  // When user chooses a color
  function chooseColor(name: string, hex: string) {
    setColorName(name);
    setColorHex(hex);
  }

  function resetDesign() {
    setDesignDataUrl(null);
    setDesignScale(1);
    setDesignX(0);
    setDesignY(0);
    setPrintArea("front");
    setQuantity(1);
    setSize("M");
    setProductType("tshirt");
    chooseColor(COLORS[0].name, COLORS[0].hex);
  }

  function onUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setDesignDataUrl(result);
      // reset transform for new design
      setDesignScale(1);
      setDesignX(0);
      setDesignY(0);
    };
    reader.readAsDataURL(file);
  }

  function addToCart(goToCart: boolean) {
    const item: CartItem = {
      id: uid(),
      createdAt: Date.now(),
      productType,
      colorName,
      colorHex,
      size,
      quantity,
      printArea,
      unitPrice,
      designDataUrl,
      designScale,
      designX,
      designY,
    };

    const cart = loadCart();
    cart.unshift(item);
    saveCart(cart);

    setAddedToast("Added to cart ✓");
    window.setTimeout(() => setAddedToast(null), 1400);

    if (goToCart) router.push("/cart");
  }

  // Drag handlers for the design inside mockup
  function onPointerDown(e: React.PointerEvent) {
    if (!designDataUrl) return;
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: designX,
      startY: designY,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDesignX(clamp(dragStartRef.current.startX + dx, -120, 120));
    setDesignY(clamp(dragStartRef.current.startY + dy, -160, 160));
  }

  function onPointerUp() {
    draggingRef.current = false;
    dragStartRef.current = null;
  }

  // Ensure quantity stays sane
  useEffect(() => {
    setQuantity((q) => clamp(Math.round(q || 1), 1, 20));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">Designer</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Create a premium product mockup. Upload now — AI generation will be added next.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => addToCart(false)}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Add to cart
          </button>
          <button
            onClick={() => addToCart(true)}
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Go to cart
          </button>
          <button
            onClick={resetDesign}
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            New design
          </button>
        </div>
      </div>

      {/* Toast */}
      {addedToast && (
        <div className="mt-6 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white">
          {addedToast}
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        {/* LEFT: Controls */}
        <div className="space-y-6">
          {/* Product */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Product</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-zinc-600">Type</label>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setProductType("tshirt")}
                    className={
                      "flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition " +
                      (productType === "tshirt"
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200")
                    }
                  >
                    T-shirt
                  </button>
                  <button
                    onClick={() => setProductType("hoodie")}
                    className={
                      "flex-1 rounded-2xl px-4 py-2 text-sm font-semibold transition " +
                      (productType === "hoodie"
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200")
                    }
                  >
                    Hoodie
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-600">Size</label>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={
                        "rounded-xl px-0 py-2 text-xs font-semibold transition " +
                        (size === s
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200")
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-600">Quantity</label>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setQuantity((q) => clamp(q - 1, 1, 20))}
                    className="h-10 w-10 rounded-xl bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                    aria-label="Decrease quantity"
                  >
                    –
                  </button>
                  <input
                    value={quantity}
                    onChange={(e) => setQuantity(clamp(parseInt(e.target.value || "1", 10), 1, 20))}
                    className="h-10 w-20 rounded-xl border border-zinc-200 bg-white text-center text-sm font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                    inputMode="numeric"
                  />
                  <button
                    onClick={() => setQuantity((q) => clamp(q + 1, 1, 20))}
                    className="h-10 w-10 rounded-xl bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-600">Print area</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["front", "back", "both"] as PrintArea[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setPrintArea(a)}
                      className={
                        "rounded-xl px-3 py-2 text-xs font-semibold transition " +
                        (printArea === a
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200")
                      }
                    >
                      {a === "front" ? "Front" : a === "back" ? "Back" : "Both"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Color */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Color</h2>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => chooseColor(c.name, c.hex)}
                  className={
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition " +
                    (colorName === c.name
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 bg-white hover:bg-zinc-50")
                  }
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="h-5 w-5 rounded-md border border-black/10"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-zinc-900">{c.name}</span>
                  </span>
                  {colorName === c.name ? (
                    <span className="text-zinc-900">✓</span>
                  ) : (
                    <span className="text-zinc-400"> </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Design */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Design</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Upload an image now. In the next step we’ll add AI generation.
            </p>

            <div className="mt-5 flex flex-col gap-4">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(f);
                  }}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-600">Scale</label>
                  <input
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    value={designScale}
                    onChange={(e) => setDesignScale(parseFloat(e.target.value))}
                    className="mt-2 w-full"
                    disabled={!designDataUrl}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs font-medium text-zinc-600">Reset position</label>
                  <button
                    onClick={() => {
                      setDesignX(0);
                      setDesignY(0);
                      setDesignScale(1);
                    }}
                    disabled={!designDataUrl}
                    className="mt-2 w-full rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-200 disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-500">
                Tip: drag the design on the mockup to position it.
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Price</h2>
            <div className="mt-4 grid gap-2 text-sm text-zinc-700">
              <div className="flex items-center justify-between">
                <span>Unit price</span>
                <span className="font-semibold text-zinc-900">{money(unitPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Quantity</span>
                <span className="font-semibold text-zinc-900">× {quantity}</span>
              </div>
              <div className="mt-2 h-px bg-zinc-200" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">Subtotal</span>
                <span className="font-semibold text-zinc-900">{money(subtotal)}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Later we’ll connect POD pricing (Printful) + your margin rules. This is the UI/flow foundation.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Mockup preview */}
        <div className="lg:sticky lg:top-24">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Preview</h2>
              <span className="text-xs font-medium text-zinc-500">
                {productType === "tshirt" ? "T-shirt" : "Hoodie"} • {colorName} • {printArea === "front" ? "Front" : printArea === "back" ? "Back" : "Both"}
              </span>
            </div>

            <div className="mt-6 flex items-center justify-center">
              {/* Mockup frame */}
              <div className="relative h-[520px] w-[360px] overflow-hidden rounded-3xl bg-zinc-50 shadow-sm ring-1 ring-black/5">
                {/* Shirt */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="relative"
                    style={{ width: 280, height: 420 }}
                  >
                    {/* Body of shirt */}
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[44px] shadow-sm"
                      style={{
                        width: 260,
                        height: 360,
                        backgroundColor: colorHex,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                      }}
                    />
                    {/* Neck */}
                    <div
                      className="absolute left-1/2 top-[82px] -translate-x-1/2 rounded-full"
                      style={{
                        width: 86,
                        height: 28,
                        backgroundColor: "rgba(255,255,255,0.12)",
                      }}
                    />

                    {/* Design area */}
                    <div
                      className="absolute left-1/2 top-[165px] -translate-x-1/2"
                      style={{
                        width: 190,
                        height: 220,
                      }}
                    >
                      {/* Drag surface */}
                      <div
                        className="absolute inset-0 rounded-2xl border border-black/10 bg-white/10"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        style={{ touchAction: "none" }}
                        aria-label="Design drag area"
                      />

                      {/* Actual image */}
                      {designDataUrl ? (
                        <img
                          src={designDataUrl}
                          alt="Design preview"
                          className="absolute left-1/2 top-1/2 select-none"
                          draggable={false}
                          style={{
                            transform: `translate(-50%, -50%) translate(${designX}px, ${designY}px) scale(${designScale})`,
                            width: 180,
                            height: "auto",
                            borderRadius: 18,
                            boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="rounded-2xl border border-dashed border-black/20 bg-white/30 px-4 py-3 text-center text-xs text-zinc-700">
                            Upload an image to preview it here
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Back/both hint (future) */}
                    {(printArea === "back" || printArea === "both") && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[11px] font-medium text-white">
                        Back print selected
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="rounded-2xl bg-white/80 p-4 backdrop-blur ring-1 ring-black/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-zinc-500">Subtotal</p>
                        <p className="text-lg font-semibold text-zinc-900">{money(subtotal)}</p>
                      </div>
                      <button
                        onClick={() => addToCart(true)}
                        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                      >
                        Checkout
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-zinc-500">
                      Later: real POD pricing + checkout. Today: perfect flow.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-6 text-xs text-zinc-500">
              This is a future-proof UI foundation. Next we’ll connect real mockups/colors from POD (Printful).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}