"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FunctionalityCard } from "./FunctionalityCard";
import { CATEGORY_ORDER, categoryMeta, type Category } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

export function FunctionalityList({ repoId }: { repoId: string }) {
  const units = useQuery(api.queries.dashboard.listFunctionalityUnits, {
    repositoryId: repoId as Id<"repositories">,
  });

  const [active, setActive] = useState<Category | null>(null);

  // Per-category counts, plus which categories actually appear.
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of units ?? []) {
      for (const c of u.categories) map[c] = (map[c] ?? 0) + 1;
    }
    return map;
  }, [units]);

  const visible = useMemo(() => {
    if (!units) return [];
    if (!active) return units;
    return units.filter((u) => u.categories.includes(active));
  }, [units, active]);

  if (units === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
        <Layers className="mb-3 h-6 w-6 text-zinc-600" />
        <p className="text-sm text-zinc-400">No functionality units yet.</p>
        <p className="mt-1 text-xs font-mono text-zinc-600">
          Hermes is still ingesting and classifying activity.
        </p>
      </div>
    );
  }

  const availableCategories = CATEGORY_ORDER.filter((c) => (counts[c] ?? 0) > 0);

  return (
    <div>
      {/* Category filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterChip
          label="All"
          count={units.length}
          active={active === null}
          onClick={() => setActive(null)}
        />
        {availableCategories.map((cat) => {
          const meta = categoryMeta(cat);
          const isActive = active === cat;
          return (
            <button
              key={cat}
              onClick={() => setActive(isActive ? null : cat)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono transition-colors",
                isActive
                  ? meta.className
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: meta.hex }}
              />
              {meta.short}
              <span className={isActive ? "opacity-70" : "text-zinc-600"}>
                {counts[cat] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 py-12 text-center text-sm text-zinc-500">
          No functionality units tagged{" "}
          <span className="text-zinc-300">
            {active ? categoryMeta(active).label : ""}
          </span>
          .
        </div>
      ) : (
        <div className="grid gap-3">
          {visible.map((u) => (
            <FunctionalityCard key={u._id} unit={u} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono transition-colors",
        active
          ? "border-white/30 bg-white/10 text-white"
          : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
      )}
    >
      {label}
      <span className={active ? "opacity-70" : "text-zinc-600"}>{count}</span>
    </button>
  );
}
