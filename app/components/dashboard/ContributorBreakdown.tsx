"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categories";

export function ContributorBreakdown({ repoId }: { repoId: string }) {
  const trends = useQuery(api.queries.dashboard.getCategoryTrends, {
    repositoryId: repoId as Id<"repositories">,
  });

  if (!trends || trends.contributors.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-white">Who works on what</h3>
        <p className="text-[11px] font-mono text-zinc-600">
          Category mix per contributor
        </p>
      </div>

      <div className="space-y-2.5">
        {trends.contributors.map((c) => (
          <div key={c.login} className="flex items-center gap-3">
            <div className="flex w-32 shrink-0 items-center gap-2">
              {c.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.avatarUrl}
                  alt={c.login}
                  className="h-5 w-5 rounded-full border border-zinc-700"
                />
              ) : (
                <div className="h-5 w-5 rounded-full border border-zinc-700 bg-zinc-800" />
              )}
              <span className="truncate text-xs text-zinc-300" title={c.login}>
                {c.login}
              </span>
            </div>

            <div className="flex h-4 flex-1 overflow-hidden rounded-full bg-zinc-800/40">
              {CATEGORY_ORDER.map((cat) => {
                const val = (c.counts[cat] as number) ?? 0;
                if (val === 0) return null;
                const pct = (val / c.total) * 100;
                return (
                  <div
                    key={cat}
                    className="h-full"
                    title={`${CATEGORY_META[cat].short}: ${val}`}
                    style={{
                      width: `${pct}%`,
                      background: CATEGORY_META[cat].hex,
                    }}
                  />
                );
              })}
            </div>

            <span className="w-8 shrink-0 text-right text-[10px] font-mono text-zinc-500">
              {c.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
