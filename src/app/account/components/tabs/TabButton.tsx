// src/app/account/components/tabs/TabButton.tsx

"use client";

export type TabButtonProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: string | number;
  disabled?: boolean;
  className?: string;
};

export function TabButton({
  active,
  onClick,
  label,
  badge,
  disabled = false,
  className,
}: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition " +
        (active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50") +
        (disabled ? " opacity-60 cursor-not-allowed" : "") +
        (className ? ` ${className}` : "")
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