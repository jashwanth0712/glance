"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { InstallGitHubApp } from "@/components/github/InstallGitHubApp";
import { FolderGit2, Lock, ArrowRight } from "lucide-react";

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "queued", className: "text-zinc-400 border-zinc-700" },
  in_progress: {
    label: "syncing",
    className: "text-amber-300 border-amber-500/40",
  },
  done: { label: "live", className: "text-emerald-300 border-emerald-500/40" },
};

export default function ReposPage() {
  const installations = useQuery(api.github.installations.listInstallations);
  const repos = useQuery(api.github.repositories.listTrackedRepos, {});

  const loading = installations === undefined || repos === undefined;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
            Tracked repositories
          </p>
          <h1 className="text-2xl font-medium tracking-tight text-white">
            Your repositories
          </h1>
        </div>
        <InstallGitHubApp label="Add GitHub" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      ) : installations.length === 0 ? (
        <EmptyState />
      ) : repos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-400">
            GitHub connected. Now pick repositories to track.
          </p>
          <div className="mt-4 flex justify-center">
            <Link
              href="/dashboard/onboarding"
              className="text-xs font-mono text-emerald-400 hover:underline"
            >
              Choose repositories →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {repos.map((repo) => {
            const status = STATUS_META[repo.backfillStatus] ?? STATUS_META.pending;
            return (
              <Link
                key={repo._id}
                href={`/dashboard/${repo._id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-center gap-3">
                  <FolderGit2 className="h-4 w-4 text-zinc-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">
                        {repo.fullName}
                      </span>
                      {repo.private && (
                        <Lock className="h-3 w-3 text-zinc-500" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-600">
                      {repo.defaultBranch}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${status.className}`}
                  >
                    {status.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-zinc-600" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-20 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
        <FolderGit2 className="h-5 w-5 text-emerald-400" />
      </div>
      <h2 className="mb-1 text-lg font-medium text-white">
        Connect your GitHub
      </h2>
      <p className="mb-6 max-w-sm text-sm text-zinc-500">
        Install the Glance GitHub App on your org to let Hermes track and
        classify what your team ships.
      </p>
      <InstallGitHubApp />
    </div>
  );
}
