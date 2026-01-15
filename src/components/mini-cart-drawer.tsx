"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCartUI } from "@/lib/cart-ui";

type CartItemLike = {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  color?: string;
  size?: string;
  printArea?: string;
  designId?: string;
  previewDataUrl?: string;
};

function eur(v: number) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(v);
}

/**
 * We proberen cart items te lezen zonder jouw cart-lib te breken.
 * - Werkt met: array in localStorage (items)
 * - Werkt met: object { items: [...] }
 * - Proberen keys: loopa_cart_v2, loopa_cart_v1, loopa_cart
 */
function readCartItemsFromStorage(): CartItemLike[] {
  if (typeof window === "undefined") return [];

  const keysToTry = ["loopa_cart_v2", "loopa_cart_v1", "loopa_cart"];
  const raw = keysToTry
    .map((k) => window.localStorage.getItem(k))
    .find((v) => typeof v === "string" && v.length > 0);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.items)
        ? parsed.items
        : [];

    if (!Array.isArray(items)) return [];

    return items.map((it: any) => ({
      id: it.id ?? it.designId ?? undefined,
      name: String(it.name ?? "Item"),
      price: typeof it.price === "number" ? it.price : Number(it.price ?? 0),
      quantity: typeof it.quantity === "number" ? it.quantity : Number(it.quantity ?? 1),
      color: it.color ? String(it.color) : undefined,
      size: it.size ? String(it.size) : undefined,
      printArea: it.printArea ? String(it.printArea) : undefined,
      designId: it.designId ? String(it.designId) : undefined,
      previewDataUrl: typeof it.previewDataUrl === "string" ? it.previewDataUrl : undefined,
    }));
  } catch {
    return [];
  }
}

export default function MiniCartDrawer() {
  const { isOpen, close } = useCartUI();
  const [items, setItems] = useState<CartItemLike[]>([]);
  const [mounted, setMounted] = useState(false);

  // mount
  useEffect(() => setMounted(true), []);

  // refresh function
  const refresh = () => {
    setItems(readCartItemsFromStorage());
  };

  // refresh on open + on events
  useEffect(() => {
    if (!mounted) return;

    // bij open direct refreshen
    if (isOpen) refresh();

    const onUpdated = () => refresh();
    window.addEventListener("loopa:cart-updated", onUpdated);

    return () => window.removeEventListener("loopa:cart-updated", onUpdated);
  }, [mounted, isOpen]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const p = Number(it.price ?? 0);
      const q = Number(it.quantity ?? 1);
      return sum + (Number.isFinite(p) ? p : 0) * (Number.isFinite(q) ? q : 1);
    }, 0);
  }, [items]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          "fixed inset-0 z-[60] bg-black/30 transition-opacity",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={close}
      />

      {/* Drawer */}
      <aside
        className={[
          "fixed right-4 top-20 z-[70] w-[360px] max-w-[calc(100vw-32px)]",
          "transition-all duration-200",
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        ].join(" ")}
        aria-hidden={!isOpen}
      >
        <div className="rounded-3xl border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Cart</p>
              <p className="text-xs text-zinc-500">{items.length} item(s)</p>
            </div>

            <button
              type="button"
              onClick={close}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Close
            </button>
          </div>

          <div className="max-h-[360px] overflow-auto px-5 py-4">
            {items.length === 0 ? (
              <p className="text-sm text-zinc-600">Je winkelmand is leeg.</p>
            ) : (
              <div className="space-y-4">
                {items.slice(0, 4).map((it, idx) => (
                  <div key={it.id ?? `${it.name}-${idx}`} className="flex gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                      {it.previewDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.previewDataUrl} alt={it.name ?? "Preview"} className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-zinc-500">No preview</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{it.name ?? "Item"}</p>
                      <p className="mt-0.5 text-xs text-zinc-600">
                        {it.color ?? "—"} • {it.size ?? "—"} • {it.printArea ?? "—"} • x{it.quantity ?? 1}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900">{eur(Number(it.price ?? 0))}</p>
                    </div>
                  </div>
                ))}

                {items.length > 4 ? (
                  <p className="text-xs text-zinc-500">+ {items.length - 4} meer in je cart…</p>
                ) : null}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-600">Subtotal</p>
              <p className="text-sm font-semibold text-zinc-900">{eur(subtotal)}</p>
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href="/cart"
                onClick={close}
                className="flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                View cart
              </Link>

              <Link
                href="/checkout"
                onClick={close}
                className="flex-1 rounded-full bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800"
              >
                Checkout
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}