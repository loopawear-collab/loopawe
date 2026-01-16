"use client";

import { useToast } from "@/components/toast-provider";

/**
 * Tiny toast helpers.
 * Usage inside a client component:
 *   const toast = useAppToast();
 *   toast.success("Added to cart ✓");
 */

export function useAppToast() {
  const { push } = useToast();

  return {
    success: (message: string, title?: string) => push({ message, title, variant: "success" }),
    error: (message: string, title?: string) => push({ message, title, variant: "error" }),
    info: (message: string, title?: string) => push({ message, title, variant: "info" }),
  };
}