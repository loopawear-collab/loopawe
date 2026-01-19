"use client";

export type AccountTabKey =
  | "overview"
  | "orders"
  | "drafts"
  | "designs"
  | "profile";

type AccountTabsProps = {
  activeTab: AccountTabKey;
  onChange: (tab: AccountTabKey) => void;

  isCreator: boolean;

  ordersCount: number;
  draftsCount: number;
  designsCount: number;
};

function TabButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition " +
        (active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50")
      }
    >
      {label}

      {typeof badge === "number" ? (
        <span
          className={
            "rounded-full px-2 py-0.5 text-xs " +
            (active
              ? "bg-white/15 text-white"
              : "bg-zinc-100 text-zinc-700")
          }
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function AccountTabs({
  activeTab,
  onChange,
  isCreator,
  ordersCount,
  draftsCount,
  designsCount,
}: AccountTabsProps) {
  return (
    <div className="mt-8 flex flex-wrap gap-2">
      {/* Always visible */}
      <TabButton
        active={activeTab === "overview"}
        onClick={() => onChange("overview")}
        label="Overzicht"
      />

      <TabButton
        active={activeTab === "orders"}
        onClick={() => onChange("orders")}
        label="Mijn orders"
        badge={ordersCount}
      />

      {/* Buyer only */}
      {!isCreator ? (
        <TabButton
          active={activeTab === "drafts"}
          onClick={() => onChange("drafts")}
          label="Mijn drafts"
          badge={draftsCount}
        />
      ) : null}

      {/* Creator only */}
      {isCreator ? (
        <>
          <TabButton
            active={activeTab === "designs"}
            onClick={() => onChange("designs")}
            label="Mijn designs"
            badge={designsCount}
          />

          <TabButton
            active={activeTab === "profile"}
            onClick={() => onChange("profile")}
            label="Creator profiel"
          />
        </>
      ) : null}
    </div>
  );
}