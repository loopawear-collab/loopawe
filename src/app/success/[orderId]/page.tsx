"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { computeOrderTotals, getOrderById, type CartItem, type Order } from "@/lib/cart";
import { reorderToCartAndOpenMiniCart } from "@/lib/cart-actions";
import { useAppToast } from "@/lib/toast";

function eur(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
}

function dt(v?: string | number | Date) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("nl-BE");
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function productLabel(it: CartItem) {
  if (it.productType === "hoodie") return "Hoodie";
  if (it.productType === "tshirt") return "T-shirt";
  const n = (it.name || "").toLowerCase();
  if (n.includes("hoodie")) return "Hoodie";
  if (n.includes("t-shirt") || n.includes("tshirt")) return "T-shirt";
  return it.name || "Item";
}

type OrderStatusKey = "processing" | "needs_address" | "created";

function getDemoOrderStatus(order: Order): { key: OrderStatusKey; label: string; hint: string; className: string } {
  // Check payment status first (paid_mock or paid)
  if (order.status === "paid_mock") {
    return {
      key: "processing",
      label: "Paid (test)",
      hint: "Test payment completed. No real charge was made.",
      className: "border-green-200 bg-green-50 text-green-700",
    };
  }

  if (order.status === "paid") {
    // TODO: When Stripe is implemented, show different message based on paymentProvider
    // if (order.paymentProvider === "stripe") {
    //   return { ...stripe paid status };
    // }
    return {
      key: "processing",
      label: "Paid",
      hint: "Payment completed successfully.",
      className: "border-green-200 bg-green-50 text-green-700",
    };
  }

  // Local-first demo: we hebben geen echte fulfilment/Stripe status.
  // We tonen daarom een consistente “demo status” op basis van data die we wel hebben.
  const hasAddress =
    Boolean(order.shippingAddress?.name?.trim()) &&
    Boolean(order.shippingAddress?.address1?.trim()) &&
    Boolean(order.shippingAddress?.zip?.trim()) &&
    Boolean(order.shippingAddress?.city?.trim()) &&
    Boolean(order.shippingAddress?.country?.trim());

  if (!hasAddress) {
    return {
      key: "needs_address",
      label: "Adres ontbreekt",
      hint: "Demo status: er is nog geen volledig verzendadres opgeslagen.",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    key: "processing",
    label: "In behandeling",
    hint: "Demo status: order is geplaatst en wacht op betaling/fulfilment (later: Stripe + Printful).",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  };
}

export default function SuccessPage() {
  const toast = useAppToast();

  const params = useParams<{ orderId?: string }>();
  const orderId = useMemo(() => {
    const raw = params?.orderId ?? "";
    return raw ? decodeURIComponent(String(raw)) : "";
  }, [params]);

  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!orderId) return;
    setOrder(getOrderById(orderId));
  }, [mounted, orderId]);

  const computed = useMemo(() => {
    if (!order) return null;
    const totals = computeOrderTotals(order);
    const unitCount = (order.items ?? []).reduce((s, it) => s + (Number.isFinite(it.quantity) ? it.quantity : 1), 0);
    return {
      ...totals,
      unitCount,
      createdAtText: dt(order.createdAt),
    };
  }, [order]);

  const status = useMemo(() => {
    if (!order) return null;
    return getDemoOrderStatus(order);
  }, [order]);

  async function onCopyOrderId() {
    if (!order?.id) return;
    const ok = await copyText(order.id);
    if (ok) toast.success("Order ID gekopieerd ✓");
    else toast.error("Kopiëren mislukt");
  }

  function onReorder() {
    if (!order || busy) return;

    const items = order.items ?? [];
    if (items.length === 0) {
      toast.info("Deze order heeft geen items.");
      return;
    }

    setBusy(true);
    try {
      const res = reorderToCartAndOpenMiniCart({ items });
      const added = res.addedCount;

      toast.success(added > 0 ? `Opnieuw toegevoegd: ${added} item(s) ✓` : "Winkelmandje geopend ✓");
    } catch {
      toast.error("Kon items niet opnieuw toevoegen");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <p className="text-sm text-zinc-600">Bezig met laden…</p>
        </div>
      </main>
    );
  }

  if (!orderId || !order || !computed) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <p className="text-xs font-medium tracking-widest text-zinc-500">SUCCESS</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Order niet gevonden</h1>
          <p className="mt-2 text-zinc-600">
            We konden je order niet laden. Dit kan gebeuren als je storage werd gewist of als je de link in een andere
            browser opende.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/marketplace"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Naar marketplace
            </Link>
            <Link
              href="/cart"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Terug naar cart
            </Link>
          </div>

          <p className="mt-8 text-xs text-zinc-500">
            Tip: later koppelen we orders aan je account (DB), zodat dit altijd terug te vinden is.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium tracking-widest text-zinc-500">SUCCESS</p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold text-zinc-900">
                Order geplaatst <span className="align-middle">✓</span>
              </h1>

              {status ? (
                <span
                  title={status.hint}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-zinc-600">
              Order <span className="font-medium text-zinc-900">{order.id}</span> • {computed.createdAtText} •{" "}
              <span className="font-medium text-zinc-900">{computed.unitCount}</span>{" "}
              {computed.unitCount === 1 ? "item" : "items"}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onCopyOrderId}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Copy Order ID
              </button>

              <button
                type="button"
                onClick={onReorder}
                disabled={busy}
                className={`rounded-full px-4 py-2 text-sm font-medium text-white ${
                  busy ? "bg-zinc-300 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
                }`}
              >
                {busy ? "Bezig…" : "Opnieuw bestellen"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/designer"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Nieuw design maken
            </Link>

            <Link
              href={`/account/orders/${encodeURIComponent(order.id)}`}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Bekijk in account →
            </Link>
          </div>
        </div>

        {/* Content grid */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Items */}
          <section className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900">Items</h2>

            <div className="mt-4 space-y-4">
              {order.items.map((it, idx) => {
                const qty = Number.isFinite(it.quantity) ? Math.max(1, Math.floor(it.quantity)) : 1;
                const unit = Number.isFinite(it.price) ? it.price : 0;
                const lineTotal = unit * qty;

                return (
                  <div
                    key={it.id ?? `${it.name}-${idx}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-5"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-14 w-14 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                        {it.previewDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.previewDataUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-zinc-500">No preview</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-900">
                          {productLabel(it)} <span className="text-zinc-500 font-normal">• ×{qty}</span>
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          {it.color} • {it.size} • {it.printArea}
                        </p>

                        {it.designId ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            Design:{" "}
                            <Link href={`/marketplace/${encodeURIComponent(it.designId)}`} className="hover:text-zinc-900">
                              view →
                            </Link>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-medium text-zinc-900">{eur(lineTotal)}</p>
                      <p className="text-xs text-zinc-500">{eur(unit)} / stuk</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Summary */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Overzicht</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-zinc-700">
                  <span>Subtotaal</span>
                  <span className="font-medium text-zinc-900">{eur(computed.subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-700">
                  <span>Verzending</span>
                  <span className="font-medium text-zinc-900">{eur(computed.shipping)}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-700">
                  <span>BTW</span>
                  <span className="text-zinc-500">Later</span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4">
                  <span className="font-semibold text-zinc-900">Totaal</span>
                  <span className="font-semibold text-zinc-900">{eur(computed.total)}</span>
                </div>
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                Dit is een demo order. Betalingen worden later toegevoegd.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Levering</h2>

              <div className="mt-4 text-sm text-zinc-700">
                <p className="font-medium text-zinc-900">{order.shippingAddress?.name ?? "—"}</p>
                <p>{order.shippingAddress?.address1 ?? "—"}</p>
                {order.shippingAddress?.address2 ? <p>{order.shippingAddress.address2}</p> : null}
                <p>
                  {(order.shippingAddress?.zip ?? "—") + " " + (order.shippingAddress?.city ?? "")}
                </p>
                <p>{order.shippingAddress?.country ?? "—"}</p>
              </div>

              <p className="mt-6 text-xs text-zinc-500">Next: Stripe betaling + Printful fulfilment.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}