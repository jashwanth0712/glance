"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CategoryBadge } from "./CategoryBadge";
import { GitPullRequest, Radio } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  raw: "queued",
  classifying: "classifying",
  classified: "classified",
  grouping: "grouping",
  done: "done",
  error: "error",
};

function timeAgo(ms?: number) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function PRFeed({ repoId }: { repoId: string }) {
  const prs = useQuery(api.queries.dashboard.listRecentPRs, {
    repositoryId: repoId as Id<"repositories">,
  });

  if (prs === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
        <Radio className="mb-3 h-6 w-6 text-zinc-600" />
        <p className="text-sm text-zinc-400">No pull requests tracked yet.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-2xl border border-zinc-800/60">
      {prs.map((pr) => (
        <div
          key={pr._id}
          className="flex items-start gap-3 bg-zinc-900/30 px-4 py-3"
        >
          <img
            src={pr.authorAvatarUrl || undefined}
            alt={pr.authorLogin}
            className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-zinc-800 object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <a
                href={pr.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 truncate text-sm text-white hover:underline"
              >
                <GitPullRequest className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <span className="truncate">{pr.title}</span>
              </a>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono text-zinc-500">
                #{pr.prNumber} · {pr.authorLogin} · {timeAgo(pr.updatedAtGh)}
              </span>
              {pr.categories.length > 0 ? (
                pr.categories.map((c) => (
                  <CategoryBadge key={c} category={c} short />
                ))
              ) : (
                <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-500">
                  {STATUS_LABEL[pr.processingStatus] ?? pr.processingStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
