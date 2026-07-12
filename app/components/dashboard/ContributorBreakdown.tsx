"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ContributorBarList } from "./ContributorBarList";

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

      <ContributorBarList contributors={trends.contributors} />
    </div>
  );
}
