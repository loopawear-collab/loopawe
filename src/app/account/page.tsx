// src/app/account/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/lib/auth";
import { useAppToast } from "@/lib/toast";
import { useCartUI } from "@/lib/cart-ui";

import {
  addToCart,
  emitCartUpdated,
  listOrders,
  type CartItem,
  type Order,
} from "@/lib/cart";

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

// ✅ correcte paden
import AccountHeader from "./components/header/AccountHeader";
import AccountTabs, { type AccountTabKey } from "./components/tabs/AccountTabs";

import OverviewSection from "./components/sections/OverviewSection";
import OrdersSection from "./components/sections/OrdersSection";
import BuyerDraftsSection from "./components/sections/BuyerDraftsSection";
import CreatorDesignsSection from "./components/sections/CreatorDesignsSection";
import CreatorProfileSection from "./components/sections/CreatorProfileSection";

function productLabel(it: CartItem) {
  if (it.productType === "hoodie") return "Hoodie";
  if (it.productType === "tshirt") return "T-shirt";
  const n = (it.name || "").toLowerCase();
  if (n.includes("hoodie")) return "Hoodie";
  if (n.includes("t-shirt") || n.includes("tshirt")) return "T-shirt";
  return it.name || "Item";
}

function units(items: Order["items"]) {
  return (items ?? []).reduce(
    (sum, it) => sum + (Number.isFinite(it.quantity) ? it.quantity : 1),
    0
  );
}

export default function AccountPage() {
  const toast = useAppToast();
  const { open } = useCartUI();
  const { user, ready, logout, setCreatorMode } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<AccountTabKey>("overview");

  const [orders, setOrders] = useState<Order[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileSaved, setProfileSaved] = useState<string | null>(null);

  const isCreator = !!user?.isCreator;
  const creatorShare = DEFAULT_CREATOR_SHARE;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    setOrders(listOrders());
    if (user?.id) setDesigns(listDesignsForUser(user.id));
    else setDesigns([]);
  }, [mounted, user?.id]);

  useEffect(() => {
    if (!mounted) return;
    if (!user?.id) return;

    ensureCreatorProfile(user.id, user.email);
    const p = getCreatorProfile(user.id);
    setDisplayName(p?.displayName ?? "");
    setBio(p?.bio ?? "");
  }, [mounted, user?.id, user?.email]);

  useEffect(() => {
    if (!mounted) return;
    if (!isCreator && (activeTab === "designs" || activeTab === "profile")) {
      setActiveTab("overview");
    }
  }, [mounted, isCreator, activeTab]);

  const buyerStats = useMemo(() => {
    const totalOrders = orders.length;
    const totalUnits = orders.reduce((s, o) => s + units(o.items), 0);

    const totalSpent = orders.reduce((sum, o) => {
      const items = o.items ?? [];
      return (
        sum +
        items.reduce((s2, it) => {
          const price = Number.isFinite(it.price) ? it.price : 0;
          const qty = Number.isFinite(it.quantity) ? it.quantity : 1;
          return s2 + price * qty;
        }, 0)
      );
    }, 0);

    return { totalOrders, totalUnits, totalSpent };
  }, [orders]);

  const perDesignStats = useMemo(
    () => computeDesignStats(orders, creatorShare),
    [orders, creatorShare]
  );

  const overall = useMemo(
    () => computeOverallStats(orders, creatorShare),
    [orders, creatorShare]
  );

  const creatorStats = useMemo(
    () => ({
      totalRevenue: overall.totalRevenue,
      totalCreatorEarnings: overall.totalCreatorEarnings,
      totalOrders: overall.totalOrders,
      totalUnits: overall.totalUnits,
    }),
    [overall]
  );

  const publishedCount = useMemo(
    () => designs.filter((d) => d.status === "published").length,
    [designs]
  );

  const draftCount = useMemo(
    () => designs.filter((d) => d.status !== "published").length,
    [designs]
  );

  // ✅ OverviewSection verwacht: published + drafts (niet publishedCount/draftCount)
  const designCounts = useMemo(
    () => ({
      total: designs.length,
      published: publishedCount,
      drafts: draftCount,
    }),
    [designs.length, publishedCount, draftCount]
  );

  const buyerDrafts = useMemo(
    () => designs.filter((d) => d.status !== "published"),
    [designs]
  );

  function refreshOrders() {
    setOrders(listOrders());
  }

  function refreshDesigns() {
    if (user?.id) setDesigns(listDesignsForUser(user.id));
    else setDesigns([]);
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

  // ✅ BuyerDraftsSection verwacht onAddToCart(design)
  function onAddToCart(design: Design) {
    const lockId = `draft:${design.id}`;
    if (busyId === lockId) return;

    setBusyId(lockId);
    try {
      addToCart({
        name: design.productType === "hoodie" ? "Hoodie" : "T-shirt",
        productType: design.productType,
        price: Number.isFinite(design.basePrice) ? design.basePrice : 0,
        quantity: 1,
        color: design.selectedColor?.name ?? "White",
        colorHex: design.selectedColor?.hex ?? undefined,
        size: "M",
        printArea: design.printArea === "back" ? "Back" : "Front",
        designId: design.id,
        previewDataUrl: design.previewFrontDataUrl || design.previewBackDataUrl || undefined,
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

  function enableCreator() {
    setCreatorMode(true);
    toast.success("Creator mode enabled ✓");
    refreshDesigns();
    setActiveTab("designs");
  }

  function disableCreator() {
    const ok = confirm(
      "Creator mode uitschakelen?\n\nJe kan nog steeds shoppen en bestellen.\nJe designs blijven lokaal bestaan, maar je kan niet meer publishen."
    );
    if (!ok) return;

    setCreatorMode(false);
    toast.success("Creator mode disabled ✓");
    setActiveTab("overview");
  }

  function onPublishToggle(designId: string, nextPublished: boolean) {
    if (!user?.id) return;
    if (busyId === designId) return;

    setBusyId(designId);
    try {
      togglePublish(designId, nextPublished);
      refreshDesigns();
    } finally {
      setBusyId(null);
    }
  }

  function onDeleteDesign(designId: string) {
    if (!user?.id) return;
    if (busyId === designId) return;

    const ok = confirm("Delete this design?");
    if (!ok) return;

    setBusyId(designId);
    try {
      deleteDesign(designId);
      refreshDesigns();
    } finally {
      setBusyId(null);
    }
  }

  function onSaveProfile() {
    if (!user?.id) return;
    upsertCreatorProfile(user.id, { displayName, bio });
    setProfileSaved("Opgeslagen ✓");
    window.setTimeout(() => setProfileSaved(null), 1500);
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
        {/* ✅ FIX 1: geen userEmail prop meer (die bestaat niet in jouw AccountHeaderProps) */}
        <AccountHeader
  email={user.email}
  userId={user.id}
  isCreator={isCreator}
  onLogout={logout}
/>

        <AccountTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          isCreator={isCreator}
          ordersCount={orders.length}
          draftsCount={buyerDrafts.length}
          designsCount={designs.length}
        />

        {activeTab === "overview" ? (
          <OverviewSection
            isCreator={isCreator}
            buyerStats={buyerStats}
            creatorStats={creatorStats}
            designCounts={designCounts}
            creatorSharePercent={Math.round(creatorShare * 100)}
            onEnableCreator={enableCreator}
            onDisableCreator={disableCreator}
          />
        ) : null}

        {activeTab === "orders" ? (
          <OrdersSection
            orders={orders}
            busyId={busyId}
            onReorder={onReorder}
            onRefresh={refreshOrders}
          />
        ) : null}

        {activeTab === "drafts" && !isCreator ? (
          <BuyerDraftsSection
            drafts={buyerDrafts}
            busyId={busyId}
            onAddToCart={onAddToCart}
          />
        ) : null}

        {activeTab === "designs" && isCreator ? (
          <CreatorDesignsSection
            userId={user.id}
            designs={designs}
            perDesignStats={perDesignStats as Map<string, DesignSalesStats | undefined>}
            busyId={busyId}
            onPublishToggle={onPublishToggle}
            onDeleteDesign={onDeleteDesign}
          />
        ) : null}

        {activeTab === "profile" && isCreator ? (
          <CreatorProfileSection
            userId={user.id}
            displayName={displayName}
            bio={bio}
            profileSaved={profileSaved}
            onChangeDisplayName={(v) => setDisplayName(v)}
            onChangeBio={(v) => setBio(v)}
            onSaveProfile={onSaveProfile}
          />
        ) : null}

        <p className="mt-10 text-xs text-zinc-500">
          Demo/local-first. Later: aparte Creator Hub (grafieken, sales, payouts) + Marketplace search + DB.
        </p>
      </div>
    </main>
  );
}