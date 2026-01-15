"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type CartUIContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const CartUIContext = createContext<CartUIContextValue | null>(null);

export function CartUIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);

  return <CartUIContext.Provider value={value}>{children}</CartUIContext.Provider>;
}

export function useCartUI() {
  const ctx = useContext(CartUIContext);
  if (!ctx) throw new Error("useCartUI must be used inside CartUIProvider");
  return ctx;
}

/**
 * Helpers: components/pages kunnen dit gebruiken om de minicart te refreshen.
 * (MiniCartDrawer luistert naar dit event.)
 */
export function emitCartUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("loopa:cart-updated"));
}