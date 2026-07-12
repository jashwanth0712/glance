"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FunctionalityList } from "@/components/dashboard/FunctionalityList";
import { PRFeed } from "@/components/dashboard/PRFeed";
import { CategoryTrends } from "@/components/dashboard/CategoryTrends";
import { CategoryHeatmap } from "@/components/dashboard/CategoryHeatmap";
import { ContributorBreakdown } from "@/components/dashboard/ContributorBreakdown";
import { GlanceButton } from "@/components/dashboard/GlanceButton";
import { categoryMeta, CATEGORY_ORDER } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { ArrowLeft, Layers, Radio } from "lucide-react";

type Tab = "functionalities" | "feed";

export default function RepoPage({
  params,
}: {
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = use(params);
  const [tab, setTab] = useState<Tab>("functionalities");

  const repo = useQuery(api.github.repositories.getRepo, {
    repositoryId: repoId as Id<"repositories">,
  });
  const stats = useQuery(api.queries.dashboard.getRepoStats, {
    repositoryId: repoId as Id<"repositories">,
  });

  if (repo === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }
  if (repo === null) {
    return (
      <div className="py-16 text-center text-sm text-zinc-400">
        Repository not found.
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/repos"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Repositories
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white">
            {repo.fullName}
          </h1>
          <p className="mt-1 text-xs font-mono text-zinc-600">
            {stats?.backfillStatus === "done"
              ? `${stats.totalUnits} functionality units · ${stats.totalClassified} changes classified`
              : "Hermes is syncing…"}
            {stats && stats.pendingCount > 0
              ? ` · ${stats.pendingCount} queued`
              : ""}
          </p>
        </div>
        {stats && stats.totalClassified > 0 && (
          <GlanceButton repoId={repoId} repoName={repo.fullName} />
        )}
      </div>

      {/* Category rollup */}
      {stats && stats.totalClassified > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CATEGORY_ORDER.map((cat) => {
            const meta = categoryMeta(cat);
            const count = stats.categoryCounts[cat] ?? 0;
            return (
              <div
                key={cat}
                className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3"
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                  <span className="text-[10px] font-mono text-zinc-500">
                    {meta.short}
                  </span>
                </div>
                <p className="mt-1 text-xl font-semibold text-white">
                  {count}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Trend visualizations */}
      {stats && stats.totalClassified > 0 && (
        <div className="mb-6 space-y-4">
          <CategoryTrends repoId={repoId} />
          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryHeatmap repoId={repoId} />
            <ContributorBreakdown repoId={repoId} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-lg border border-zinc-800 bg-black/60 p-0.5">
        <TabButton
          active={tab === "functionalities"}
          onClick={() => setTab("functionalities")}
          icon={Layers}
          label="Functionalities"
        />
        <TabButton
          active={tab === "feed"}
          onClick={() => setTab("feed")}
          icon={Radio}
          label="Live feed"
        />
      </div>

      {tab === "functionalities" ? (
        <FunctionalityList repoId={repoId} />
      ) : (
        <PRFeed repoId={repoId} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Layers;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-mono transition-colors",
        active
          ? "bg-indigo-500/90 text-white shadow"
          : "text-zinc-400 hover:text-white",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
