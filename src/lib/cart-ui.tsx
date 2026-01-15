"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CartItem } from "@/lib/cart";

type MiniCartPayload = {
  lastAdded?: CartItem;
};

type CartUIContextValue = {
  isMiniCartOpen: boolean;
  lastAdded: CartItem | null;
  openMiniCart: (item?: CartItem | null) => void;
  closeMiniCart: () => void;
};

const CartUIContext = createContext<CartUIContextValue | null>(null);

export function CartUIProvider({ children }: { children: React.ReactNode }) {
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartItem | null>(null);

  const openMiniCart = useCallback((item?: CartItem | null) => {
    if (item) setLastAdded(item);
    setIsMiniCartOpen(true);
  }, []);

  const closeMiniCart = useCallback(() => {
    setIsMiniCartOpen(false);
  }, []);

  const value = useMemo<CartUIContextValue>(
    () => ({ isMiniCartOpen, lastAdded, openMiniCart, closeMiniCart }),
    [isMiniCartOpen, lastAdded, openMiniCart, closeMiniCart]
  );

  return <CartUIContext.Provider value={value}>{children}</CartUIContext.Provider>;
}

export function useCartUI() {
  const ctx = useContext(CartUIContext);
  if (!ctx) throw new Error("useCartUI must be used inside <CartUIProvider>");
  return ctx;
}