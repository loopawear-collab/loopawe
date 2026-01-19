// src/app/account/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth";
import {
  addToCart,
  computeOrderTotals,
  emitCartUpdated,
  listOrders,
  type CartItem,
  type Order,
} from "@/lib/cart";
import { useCartUI } from "@/lib/cart-ui";
import { useAppToast } from "@/lib/toast";

import {
  listDesignsForUser,
  togglePublish,
  deleteDesign,
  type Design,
} from "@/lib/designs";
import {
  computeDesignStats,
  computeOverallStats,
  DEFAULT_CREATOR_SHARE,
  type DesignSalesStats,
} from "@/lib/analytics";
import {
  ensureCreatorProfile,
  getCreatorProfile,
  upsertCreatorProfile,
} from "@/lib/creator-profile";

type TabKey = "overview" | "orders" | "designs" | "profile" | "drafts";

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

function getDesignPreview(d: Design): string | null {
  return d.previewFrontDataUrl || d.previewBackDataUrl || null;
}

function productLabel(it: CartItem) {
  if (it.productType === "hoodie") return "Hoodie";
  if (it.productType === "tshirt") return "T-shirt";
  const n = (it.name || "").toLowerCase();
  if (n.includes("hoodie")) return "Hoodie";
  if (n.includes("t-shirt") || n.includes("tshirt")) return "T-shirt";
  return it.name || "Item";
}

function units(items: Order["items"]) {
  return (items ?? []).reduce((sum, it) => sum + (Number.isFinite(it.quantity) ? it.quantity : 1), 0);
}

function firstPreview(items: Order["items"]): string | undefined {
  return (items ?? []).find((it) => typeof it.previewDataUrl === "string" && it.previewDataUrl)?.previewDataUrl;
}

function TabButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: string | number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition " +
        (active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
      }
    >
      {label}
      {badge !== undefined ? (
        <span
          className={
            "rounded-full px-2 py-0.5 text-xs " +
            (active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-700")
          }
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function ModePill({ isCreator }: { isCreator: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium " +
        (isCreator
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-zinc-50 text-zinc-700")
      }
    >
      {isCreator ? "Creator account" : "Buyer account"}
    </span>
  );
}

export default function AccountPage() {
  const toast = useAppToast();
  const { open } = useCartUI();
  const { user, ready, logout, setCreatorMode } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  const [orders, setOrders] = useState<Order[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileSaved, setProfileSaved] = useState<string | null>(null);

  const creatorShare = DEFAULT_CREATOR_SHARE;
  const isCreator = !!user?.isCreator;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    setOrders(listOrders());
    if (user?.id) setDesigns(listDesignsForUser(user.id));
    else setDesigns([]);
  }, [mounted, user?.id]);

  // Ensure & load profile (safe to load always; UI shows it only for creators)
  useEffect(() => {
    if (!mounted) return;
    if (!user?.id) return;

    ensureCreatorProfile(user.id, user.email);
    const p = getCreatorProfile(user.id);
    setDisplayName(p?.displayName ?? "");
    setBio(p?.bio ?? "");
  }, [mounted, user?.id, user?.email]);

  // Never allow buyer to sit on creator tabs
  useEffect(() => {
    if (!mounted) return;
    if (!isCreator && (tab === "designs" || tab === "profile")) setTab("overview");
  }, [mounted, isCreator, tab]);

  const buyerStats = useMemo(() => {
    const totalOrders = orders.length;
    const totalUnits = orders.reduce((s, o) => s + units(o.items), 0);
    const totalSpent = orders.reduce((s, o) => s + computeOrderTotals(o).total, 0);
    return { totalOrders, totalUnits, totalSpent };
  }, [orders]);

  const perDesignStats = useMemo(() => computeDesignStats(orders, creatorShare), [orders, creatorShare]);
  const overall = useMemo(() => computeOverallStats(orders, creatorShare), [orders, creatorShare]);

  const publishedCount = useMemo(() => designs.filter((d) => d.status === "published").length, [designs]);
  const draftCount = useMemo(() => designs.filter((d) => d.status !== "published").length, [designs]);

  // ✅ buyer drafts list
  const buyerDrafts = useMemo(() => designs.filter((d) => d.status !== "published"), [designs]);

  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);

  function refreshOrders() {
    setOrders(listOrders());
  }

  function onReorder(order: Order) {
    const lockId = `order:${order.id}`;
    if (busyId === lockId) return;

    const items = order.items ?? [];
    if (items.length === 0) {
      toast.info("Deze order heeft geen items.");
      return;
    }

    setBusyId(lockId);
    try {
      for (const it of items) {
        const qty = Number.isFinite(it.quantity) ? Math.max(1, Math.floor(it.quantity)) : 1;

        addToCart({
          name: it.name ?? productLabel(it),
          productType: it.productType,
          price: Number.isFinite(it.price) ? it.price : 0,
          quantity: qty,
          color: it.color ?? "White",
          colorHex: it.colorHex,
          size: it.size ?? "M",
          printArea: it.printArea ?? "Front",
          designId: it.designId,
          previewDataUrl: it.previewDataUrl,
        });
      }

      emitCartUpdated();
      open();
      toast.success(`Opnieuw toegevoegd: ${items.length} item(s) ✓`);
    } catch {
      toast.error("Kon items niet opnieuw toevoegen");
    } finally {
      setBusyId(null);
    }
  }

  function enableCreator() {
    setCreatorMode(true);
    toast.success("Creator mode enabled ✓");
    if (user?.id) setDesigns(listDesignsForUser(user.id));
    setTab("designs");
  }

  function disableCreator() {
    const ok = confirm(
      "Creator mode uitschakelen?\n\nJe kan nog steeds shoppen en bestellen.\nJe designs blijven lokaal bestaan, maar je kan niet meer publishen."
    );
    if (!ok) return;
    setCreatorMode(false);
    toast.success("Creator mode disabled ✓");
    setTab("overview");
  }

  function addDesignToCart(d: Design) {
    const lockId = `draft:${d.id}`;
    if (busyId === lockId) return;

    setBusyId(lockId);
    try {
      addToCart({
        name: d.productType === "hoodie" ? "Hoodie" : "T-shirt",
        productType: d.productType,
        price: Number.isFinite(d.basePrice) ? d.basePrice : 0,
        quantity: 1,
        color: d.selectedColor?.name ?? "White",
        colorHex: d.selectedColor?.hex ?? undefined,
        size: "M",
        printArea: d.printArea === "back" ? "Back" : "Front",
        designId: d.id,
        previewDataUrl: d.previewFrontDataUrl || d.previewBackDataUrl || undefined,
      });

      emitCartUpdated();
      open();
      toast.success("Toegevoegd aan cart ✓");
    } catch {
      toast.error("Kon niet toevoegen aan cart");
    } finally {
      setBusyId(null);
    }
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
          <h1 className="text-3xl font-semibold text-zinc-900">Account</h1>
          <p className="mt-2 text-zinc-600">Je bent niet ingelogd.</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Register
            </Link>
          </div>
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
            <p className="text-xs font-medium tracking-widest text-zinc-500">ACCOUNT</p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold text-zinc-900">Account</h1>
              <ModePill isCreator={isCreator} />
            </div>

            <p className="mt-2 text-sm text-zinc-600">
              Ingelogd als <span className="font-medium text-zinc-900">{user.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {isCreator ? (
              <Link
                href={`/c/${encodeURIComponent(user.id)}`}
                className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                My shop
              </Link>
            ) : null}

            <Link
              href="/designer"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Naar designer
            </Link>

            <Link
              href="/marketplace"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Marketplace
            </Link>

            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex flex-wrap gap-2">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")} label="Overzicht" />
          <TabButton active={tab === "orders"} onClick={() => setTab("orders")} label="Mijn orders" badge={orders.length} />

          {!isCreator ? (
            <TabButton
              active={tab === "drafts"}
              onClick={() => setTab("drafts")}
              label="Mijn drafts"
              badge={buyerDrafts.length}
            />
          ) : null}

          {isCreator ? (
            <>
              <TabButton
                active={tab === "designs"}
                onClick={() => setTab("designs")}
                label="Mijn designs"
                badge={designs.length}
              />
              <TabButton active={tab === "profile"} onClick={() => setTab("profile")} label="Creator profiel" />
            </>
          ) : null}
        </div>

        {/* TAB: OVERVIEW */}
        {tab === "overview" ? (
          <>
            {/* Mode / CTA */}
            <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-widest text-zinc-500">ACCOUNT MODE</p>

                  <h2 className="mt-2 text-xl font-semibold text-zinc-900">
                    {isCreator ? "Creator dashboard (demo)" : "Buyer account (demo)"}
                  </h2>

                  <p className="mt-2 text-sm text-zinc-600">
                    {isCreator ? (
                      <>
                        Als creator kan je publishen naar de marketplace en later krijg je sales/grafieken/payouts.
                      </>
                    ) : (
                      <>
                        Als buyer kan je shoppen, bestellen en de designer gebruiken voor jezelf. Publishen naar de
                        marketplace kan alleen als creator.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!isCreator ? (
                    <button
                      type="button"
                      onClick={enableCreator}
                      className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      Creator worden
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={disableCreator}
                      className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                    >
                      Terug naar buyer
                    </button>
                  )}

                  <Link
                    href="/designer"
                    className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Design maken
                  </Link>
                </div>
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                Demo: roles zitten lokaal. Later: echte onboarding + verificatie + DB.
              </p>
            </div>

            {/* Stats */}
            {isCreator ? (
              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">REVENUE</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{eur(overall.totalRevenue)}</p>
                  <p className="mt-1 text-xs text-zinc-500">Gross sales</p>
                </div>
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">EARNINGS</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{eur(overall.totalCreatorEarnings)}</p>
                  <p className="mt-1 text-xs text-zinc-500">Creator share ({Math.round(creatorShare * 100)}%)</p>
                </div>
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">DESIGNS</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{designs.length}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {publishedCount} published • {draftCount} drafts
                  </p>
                </div>
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">ORDERS</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{overall.totalOrders}</p>
                  <p className="mt-1 text-xs text-zinc-500">{overall.totalUnits} items sold</p>
                </div>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">ORDERS</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{buyerStats.totalOrders}</p>
                  <p className="mt-1 text-xs text-zinc-500">Totaal bestellingen</p>
                </div>
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">ITEMS</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{buyerStats.totalUnits}</p>
                  <p className="mt-1 text-xs text-zinc-500">Totaal items gekocht</p>
                </div>
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">SPENT</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{eur(buyerStats.totalSpent)}</p>
                  <p className="mt-1 text-xs text-zinc-500">Demo totaal (incl. shipping)</p>
                </div>
              </div>
            )}

            <p className="mt-10 text-xs text-zinc-500">
              Demo/local-first. Later: aparte Creator Hub (grafieken, sales, payouts) + Marketplace search + DB.
            </p>
          </>
        ) : null}

        {/* TAB: BUYER DRAFTS */}
        {tab === "drafts" && !isCreator ? (
          <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-widest text-zinc-500">BUYER</p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Mijn drafts</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Dit zijn je private designs. Ze verschijnen niet op de marketplace.
                </p>
              </div>

              <Link
                href="/designer"
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Nieuw draft
              </Link>
            </div>

            <div className="mt-6">
              {buyerDrafts.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-8">
                  <p className="text-sm text-zinc-600">Nog geen drafts. Maak er eentje in de designer.</p>
                  <div className="mt-5">
                    <Link
                      href="/designer"
                      className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      Naar designer
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {buyerDrafts.map((d) => {
                    const preview = getDesignPreview(d);
                    const lockId = `draft:${d.id}`;
                    const isBusy = busyId === lockId;

                    return (
                      <div key={d.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-900">{d.title || "Untitled design"}</p>
                            <p className="mt-1 text-xs text-zinc-500">Draft • Updated {dt(d.updatedAt)}</p>
                          </div>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => addDesignToCart(d)}
                            className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                          >
                            {isBusy ? "Bezig…" : "Add to cart"}
                          </button>
                        </div>

                        <div className="mt-4 flex items-center gap-4">
                          <div className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                            {preview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={preview} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-zinc-500">No preview</span>
                            )}
                          </div>

                          <div className="text-xs text-zinc-600">
                            <p>
                              {d.productType === "hoodie" ? "Hoodie" : "T-shirt"} •{" "}
                              {d.printArea === "back" ? "Back" : "Front"}
                            </p>
                            <p className="mt-1 font-semibold text-zinc-900">{eur(d.basePrice)}</p>
                          </div>

                          <div className="ml-auto">
                            <Link
                              href="/designer"
                              className="text-xs text-zinc-600 hover:text-zinc-900"
                            >
                              Open designer →
                            </Link>
                          </div>
                        </div>

                        <p className="mt-4 text-xs text-zinc-500">
                          Private draft (buyer). Alleen creators kunnen publishen.
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* TAB: CREATOR PROFILE */}
        {tab === "profile" && isCreator ? (
          <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-medium tracking-widest text-zinc-500">CREATOR PROFILE</p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Creator profiel</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Dit is wat mensen zien op je creator shop. (Local-first demo)
                </p>
              </div>

              <Link
                href={`/c/${encodeURIComponent(user.id)}`}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Preview shop →
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-600">Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="Loopa Creator"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600">Bio</label>
                <input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="Wat maak jij?"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  upsertCreatorProfile(user.id, { displayName, bio });
                  setProfileSaved("Opgeslagen ✓");
                  window.setTimeout(() => setProfileSaved(null), 1500);
                }}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Profiel opslaan
              </button>

              {profileSaved ? <span className="text-sm text-zinc-600">{profileSaved}</span> : null}
            </div>
          </div>
        ) : null}

        {/* TAB: MY DESIGNS */}
        {tab === "designs" && isCreator ? (
          <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium tracking-widest text-zinc-500">CREATOR</p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Mijn designs</h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{designs.length} designs</span>
                <Link
                  href="/designer"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Nieuw design
                </Link>
              </div>
            </div>

            <div className="mt-6">
              {designs.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-8">
                  <p className="text-sm text-zinc-600">Nog geen designs. Maak er eentje in de designer.</p>
                  <div className="mt-5">
                    <Link
                      href="/designer"
                      className="inline-flex rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      Naar designer
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {designs.map((d) => {
                    const preview = getDesignPreview(d);
                    const stats: DesignSalesStats | undefined = perDesignStats.get(d.id);

                    const soldUnits = stats?.unitsSold ?? 0;
                    const revenue = stats?.revenue ?? 0;
                    const earnings = stats?.creatorEarnings ?? 0;

                    return (
                      <div key={d.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-900">{d.title || "Untitled design"}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {d.status === "published" ? "Published" : "Draft"} • Updated {dt(d.updatedAt)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busyId === d.id}
                              onClick={() => {
                                setBusyId(d.id);
                                togglePublish(d.id, d.status !== "published");
                                setDesigns(listDesignsForUser(user.id));
                                setBusyId(null);
                              }}
                              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                            >
                              {d.status === "published" ? "Unpublish" : "Publish"}
                            </button>

                            <button
                              type="button"
                              disabled={busyId === d.id}
                              onClick={() => {
                                if (!confirm("Delete this design?")) return;
                                setBusyId(d.id);
                                deleteDesign(d.id);
                                setDesigns(listDesignsForUser(user.id));
                                setBusyId(null);
                              }}
                              className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-4">
                          <div className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                            {preview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={preview} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-zinc-500">No preview</span>
                            )}
                          </div>

                          <div className="text-xs text-zinc-600">
                            <p>
                              {d.productType === "hoodie" ? "Hoodie" : "T-shirt"} •{" "}
                              {d.printArea === "back" ? "Back" : "Front"}
                            </p>
                            <p className="mt-1 font-semibold text-zinc-900">{eur(d.basePrice)}</p>
                          </div>

                          <div className="ml-auto">
                            <Link
                              href={`/marketplace/${encodeURIComponent(d.id)}`}
                              className="text-xs text-zinc-600 hover:text-zinc-900"
                            >
                              View →
                            </Link>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                            <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400">SOLD</p>
                            <p className="mt-1 text-sm font-semibold text-zinc-900">{soldUnits}</p>
                          </div>

                          <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                            <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400">REVENUE</p>
                            <p className="mt-1 text-sm font-semibold text-zinc-900">{eur(revenue)}</p>
                          </div>

                          <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                            <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400">EARNINGS</p>
                            <p className="mt-1 text-sm font-semibold text-zinc-900">{eur(earnings)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* TAB: MY ORDERS */}
        {tab === "orders" ? (
          <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium tracking-widest text-zinc-500">ORDERS</p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Mijn orders</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Je kan je volledige order history ook openen op de aparte pagina.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/account/orders"
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Alle orders →
                </Link>
                <button
                  type="button"
                  onClick={refreshOrders}
                  className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-6">
              {orders.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-8">
                  <p className="text-sm text-zinc-600">Je hebt nog geen orders.</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/marketplace"
                      className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      Naar marketplace
                    </Link>
                    <Link
                      href="/designer"
                      className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                    >
                      Maak een design
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => {
                    const preview = firstPreview(o.items);
                    const unitTotal = units(o.items);
                    const totals = computeOrderTotals(o);
                    const lockId = `order:${o.id}`;
                    const isBusy = busyId === lockId;

                    return (
                      <div key={o.id} className="rounded-3xl border border-zinc-200 bg-white p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                              {preview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preview} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-[10px] text-zinc-500">No preview</span>
                              )}
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-zinc-900">Order {o.id}</p>
                              <p className="mt-1 text-xs text-zinc-600">
                                {dt(o.createdAt)} • {unitTotal} {unitTotal === 1 ? "item" : "items"}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-zinc-500">Totaal</p>
                            <p className="text-lg font-semibold text-zinc-900">{eur(totals.total)}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <Link
                            href={`/account/orders/${encodeURIComponent(o.id)}`}
                            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                          >
                            Bekijk details →
                          </Link>

                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => onReorder(o)}
                              disabled={isBusy}
                              className={`rounded-full px-4 py-2 text-sm font-medium text-white ${
                                isBusy ? "bg-zinc-300 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
                              }`}
                            >
                              {isBusy ? "Bezig…" : "Bestel opnieuw"}
                            </button>

                            <Link
                              href="/marketplace"
                              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                            >
                              Opnieuw shoppen
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="mt-6 text-xs text-zinc-500">
              Alles is local-first demo. Later migreren we naar DB + Stripe + Printful.
            </p>
          </div>
        ) : null}

        <p className="mt-10 text-xs text-zinc-500">
          Demo/local-first. Later: aparte Creator Hub (grafieken, sales, payouts) + Marketplace search + DB.
        </p>
      </div>
    </main>
  );
}