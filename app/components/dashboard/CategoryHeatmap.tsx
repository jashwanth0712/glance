"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categories";

function weekLabel(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Hex + alpha where alpha scales with intensity (0..1).
function tint(hex: string, intensity: number): string {
  if (intensity <= 0) return "transparent";
  const a = 0.12 + intensity * 0.83; // floor so a single change is visible
  const alpha = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alpha}`;
}

export function CategoryHeatmap({ repoId }: { repoId: string }) {
  const trends = useQuery(api.queries.dashboard.getCategoryTrends, {
    repositoryId: repoId as Id<"repositories">,
  });

  if (!trends || trends.weeks.length === 0) return null;

  const weeks = trends.weeks;
  // Per-category max to normalize intensity within each row independently.
  const rowMax: Record<string, number> = {};
  for (const c of CATEGORY_ORDER) {
    rowMax[c] = Math.max(1, ...weeks.map((w) => (w[c] as number) ?? 0));
  }

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-white">Category heatmap</h3>
        <p className="text-[11px] font-mono text-zinc-600">
          Intensity = changes per category, per week
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {CATEGORY_ORDER.map((c) => {
            const meta = CATEGORY_META[c];
            return (
              <div key={c} className="flex items-center gap-2">
                <div className="w-16 shrink-0 py-0.5 text-right text-[10px] font-mono text-zinc-500">
                  {meta.short}
                </div>
                <div className="flex gap-1 py-0.5">
                  {weeks.map((w) => {
                    const count = (w[c] as number) ?? 0;
                    return (
                      <div
                        key={w.weekStart}
                        title={`${meta.short} · ${weekLabel(w.weekStart)} · ${count}`}
                        className="h-5 w-5 rounded-sm border border-zinc-800/40"
                        style={{
                          background: tint(meta.hex, count / rowMax[c]),
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Week axis */}
          <div className="mt-1 flex items-center gap-2">
            <div className="w-16 shrink-0" />
            <div className="flex gap-1">
              {weeks.map((w, i) => (
                <div
                  key={w.weekStart}
                  className="w-5 text-center text-[8px] font-mono text-zinc-600"
                >
                  {i % 2 === 0 ? new Date(w.weekStart).getUTCDate() : ""}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
