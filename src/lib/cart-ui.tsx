// src/lib/cart-ui.tsx
"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

/**
 * Mini cart UI state (drawer open/close) + lightweight "cart updated" event bus.
 * Local-first & framework-safe (no window access during SSR).
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function emitCartUpdated() {
  // notify all listeners
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeCartUpdated(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export type CartUIContextValue = {
  isMiniCartOpen: boolean;
  openMiniCart: () => void;
  closeMiniCart: () => void;
  toggleMiniCart: () => void;
};

const CartUIContext = createContext<CartUIContextValue | null>(null);

export function CartUIProvider({ children }: { children: React.ReactNode }) {
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);

  const value = useMemo<CartUIContextValue>(() => {
    return {
      isMiniCartOpen,
      openMiniCart: () => setIsMiniCartOpen(true),
      closeMiniCart: () => setIsMiniCartOpen(false),
      toggleMiniCart: () => setIsMiniCartOpen((v) => !v),
    };
  }, [isMiniCartOpen]);

  return <CartUIContext.Provider value={value}>{children}</CartUIContext.Provider>;
}

export function useCartUI() {
  const ctx = useContext(CartUIContext);
  if (!ctx) throw new Error("useCartUI must be used inside CartUIProvider");
  return ctx;
}