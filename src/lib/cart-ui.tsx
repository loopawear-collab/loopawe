// src/lib/cart-ui.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Cart UI (Mini-cart drawer) state manager
 *
 * ✅ Single source of truth for the drawer open/close state
 * ✅ Backwards-compatible aliases:
 *   - openMiniCart / closeMiniCart / isMiniCartOpen (context fields)
 * ✅ Also provides global helpers (named exports) so non-React code can open/close:
 *   - openMiniCart() / closeMiniCart()
 */

const UI_OPEN_EVENT = "loopa:cartui:open";
const UI_CLOSE_EVENT = "loopa:cartui:close";

function safeDispatch(name: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}

/** ✅ Named exports (so cart-actions.ts can import them) */
export function openMiniCart() {
  safeDispatch(UI_OPEN_EVENT);
}
export function closeMiniCart() {
  safeDispatch(UI_CLOSE_EVENT);
}

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

  /** ✅ Listen to global open/close events so openMiniCart() works everywhere */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOpen = () => setIsOpen(true);
    const onClose = () => setIsOpen(false);

    window.addEventListener(UI_OPEN_EVENT, onOpen);
    window.addEventListener(UI_CLOSE_EVENT, onClose);

    return () => {
      window.removeEventListener(UI_OPEN_EVENT, onOpen);
      window.removeEventListener(UI_CLOSE_EVENT, onClose);
    };
  }, []);

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