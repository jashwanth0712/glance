// Client-safe category metadata (labels + colors) shared across the dashboard.

export type Category =
  | "end_user_features"
  | "admin_support"
  | "performance"
  | "cost_improvement"
  | "tech_debt";

export const CATEGORY_ORDER: Category[] = [
  "end_user_features",
  "admin_support",
  "performance",
  "cost_improvement",
  "tech_debt",
];

export const CATEGORY_META: Record<
  Category,
  { label: string; short: string; className: string; dot: string; hex: string }
> = {
  end_user_features: {
    label: "End User Features",
    short: "Features",
    className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
    hex: "#34d399", // emerald-400
  },
  admin_support: {
    label: "Admin & Support",
    short: "Admin",
    className: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    dot: "bg-indigo-400",
    hex: "#818cf8", // indigo-400
  },
  performance: {
    label: "Performance",
    short: "Perf",
    className: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    dot: "bg-cyan-400",
    hex: "#22d3ee", // cyan-400
  },
  cost_improvement: {
    label: "Cost Improvement",
    short: "Cost",
    className: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
    hex: "#fbbf24", // amber-400
  },
  tech_debt: {
    label: "Tech Debt",
    short: "Debt",
    className: "bg-zinc-500/10 text-zinc-300 border-zinc-500/40",
    dot: "bg-zinc-400",
    hex: "#a1a1aa", // zinc-400
  },
};

export function categoryMeta(cat: string) {
  return (
    CATEGORY_META[cat as Category] ?? {
      label: cat,
      short: cat,
      className: "bg-zinc-500/10 text-zinc-300 border-zinc-500/40",
      dot: "bg-zinc-400",
      hex: "#a1a1aa",
    }
  );
}
