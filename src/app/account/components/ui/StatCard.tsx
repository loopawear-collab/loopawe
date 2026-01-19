// src/app/account/components/ui/StatCard.tsx

"use client";

export type StatCardProps = {
  label: string; // e.g. "REVENUE"
  value: React.ReactNode; // e.g. "€ 123,45"
  sublabel?: string; // e.g. "Gross sales"
  className?: string;
};

export function StatCard({ label, value, sublabel, className }: StatCardProps) {
  return (
    <div
      className={
        "rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm" + (className ? ` ${className}` : "")
      }
    >
      <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
      {sublabel ? <p className="mt-1 text-xs text-zinc-500">{sublabel}</p> : null}
    </div>
  );
}