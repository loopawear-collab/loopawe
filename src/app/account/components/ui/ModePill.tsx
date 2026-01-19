// src/app/account/components/ui/ModePill.tsx

"use client";

export type ModePillProps = {
  isCreator: boolean;
  className?: string;
  creatorLabel?: string;
  buyerLabel?: string;
};

export function ModePill({
  isCreator,
  className,
  creatorLabel = "Creator account",
  buyerLabel = "Buyer account",
}: ModePillProps) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium " +
        (isCreator
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-zinc-50 text-zinc-700") +
        (className ? ` ${className}` : "")
      }
    >
      {isCreator ? creatorLabel : buyerLabel}
    </span>
  );
}