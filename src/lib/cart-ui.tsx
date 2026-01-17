// src/lib/cart-ui.tsx
"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Cart UI (Mini-cart drawer) state manager
 *
 * ✅ Single source of truth for the drawer open/close state
 * ✅ Backwards-compatible aliases:
 *   - openMiniCart / closeMiniCart / isMiniCartOpen
 * ✅ Clean API:
 *   - open / close / toggle / setOpen / isOpen
 */

export type CartUIContextValue = {
  // canonical API
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (v: boolean) => void;

  // backwards-compatible aliases (older code might use these)
  isMiniCartOpen: boolean;
  openMiniCart: () => void;
  closeMiniCart: () => void;
};

const CartUIContext = createContext<CartUIContextValue | null>(null);

export function CartUIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo<CartUIContextValue>(() => {
    return {
      // canonical
      isOpen,
      open,
      close,
      toggle,
      setOpen: setIsOpen,

      // aliases
      isMiniCartOpen: isOpen,
      openMiniCart: open,
      closeMiniCart: close,
    };
  }, [isOpen, open, close, toggle]);

  return <CartUIContext.Provider value={value}>{children}</CartUIContext.Provider>;
}

export function useCartUI(): CartUIContextValue {
  const ctx = useContext(CartUIContext);
  if (!ctx) throw new Error("useCartUI must be used inside CartUIProvider");
  return ctx;
}