"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FunctionalityCard } from "./FunctionalityCard";
import { Layers } from "lucide-react";

export function FunctionalityList({ repoId }: { repoId: string }) {
  const units = useQuery(api.queries.dashboard.listFunctionalityUnits, {
    repositoryId: repoId as Id<"repositories">,
  });

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

  return (
    <div className="grid gap-3">
      {units.map((u) => (
        <FunctionalityCard key={u._id} unit={u} />
      ))}
    </div>
  );
}
