"use client";

import { useState, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BackfillModeModal, type BackfillMode } from "./BackfillModeModal";
import { Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type AvailableRepo = {
  githubRepoId: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  tracked: boolean;
};

export function RepoSelector({
  installationId,
}: {
  installationId: string;
}) {
  const listAvailableRepos = useAction(api.github.ingest.listAvailableRepos);
  const addRepository = useMutation(api.github.repositories.addRepository);

  const [repos, setRepos] = useState<AvailableRepo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AvailableRepo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listAvailableRepos({
      installationId: installationId as Id<"githubInstallations">,
    })
      .then((r) => {
        if (!cancelled) setRepos(r as AvailableRepo[]);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [installationId, listAvailableRepos]);

  const confirm = async (mode: BackfillMode) => {
    if (!selected) return;
    setBusy(true);
    try {
      await addRepository({
        installationId: installationId as Id<"githubInstallations">,
        githubRepoId: selected.githubRepoId,
        owner: selected.owner,
        name: selected.name,
        fullName: selected.fullName,
        defaultBranch: selected.defaultBranch,
        private: selected.private,
        backfillMode: mode,
      });
      setRepos(
        (prev) =>
          prev?.map((r) =>
            r.githubRepoId === selected.githubRepoId
              ? { ...r, tracked: true }
              : r,
          ) ?? null,
      );
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <p className="text-xs font-mono text-red-400">
        Failed to load repositories: {error}
      </p>
    );
  }

  if (repos === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-2">
        {repos.map((repo) => (
          <button
            key={repo.githubRepoId}
            disabled={repo.tracked}
            onClick={() => setSelected(repo)}
            className={cn(
              "flex items-center justify-between rounded-xl border p-3 text-left transition-colors",
              repo.tracked
                ? "cursor-default border-zinc-800/60 bg-zinc-900/30"
                : "border-zinc-800 bg-black/40 hover:border-zinc-600",
            )}
          >
            <div className="flex items-center gap-2">
              {repo.private && (
                <Lock className="h-3.5 w-3.5 text-zinc-500" />
              )}
              <span className="text-sm text-white">{repo.fullName}</span>
            </div>
            {repo.tracked ? (
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <Check className="h-3.5 w-3.5" /> tracking
              </span>
            ) : (
              <span className="text-[10px] font-mono text-zinc-500">
                Track →
              </span>
            )}
          </button>
        ))}
        {repos.length === 0 && (
          <p className="text-sm text-zinc-500">
            No repositories accessible to this installation.
          </p>
        )}
      </div>

      {selected && (
        <BackfillModeModal
          repoName={selected.fullName}
          busy={busy}
          onConfirm={confirm}
          onCancel={() => setSelected(null)}
        />
      )}
    </>
  );
}
