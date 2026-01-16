"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  createdAt: number;
  durationMs: number;
};

type ToastContextValue = {
  push: (input: { message: string; variant?: ToastVariant; title?: string; durationMs?: number }) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function uid(prefix = "T") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const api = useMemo<ToastContextValue>(() => {
    return {
      push: ({ message, variant = "info", title, durationMs = 2400 }) => {
        const item: ToastItem = {
          id: uid(),
          title,
          message,
          variant,
          createdAt: Date.now(),
          durationMs,
        };
        setToasts((prev) => [item, ...prev].slice(0, 3));
      },
      clear: () => setToasts([]),
    };
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((t) =>
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, t.durationMs)
    );

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [toasts]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* ✅ Bottom-center toast stack */}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[9999] w-[360px] max-w-[92vw] -translate-x-1/2">
        <div className="flex flex-col gap-3">
          {toasts.map((t) => {
            const tone =
              t.variant === "success"
                ? "border-emerald-200 bg-white"
                : t.variant === "error"
                ? "border-red-200 bg-white"
                : "border-zinc-200 bg-white";

            const dot =
              t.variant === "success"
                ? "bg-emerald-500"
                : t.variant === "error"
                ? "bg-red-500"
                : "bg-zinc-400";

            return (
              <div
                key={t.id}
                className={`pointer-events-auto rounded-2xl border ${tone} p-4 shadow-lg`}
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                  <div className="min-w-0 flex-1">
                    {t.title ? <p className="text-sm font-semibold text-zinc-900">{t.title}</p> : null}
                    <p className="text-sm text-zinc-700">{t.message}</p>
                  </div>

                  <button
                    type="button"
                    className="ml-2 rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}