"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { InstallGitHubApp } from "@/components/github/InstallGitHubApp";
import { RepoSelector } from "@/components/github/RepoSelector";
import { GitBranch } from "lucide-react";

export default function OnboardingPage() {
  const installations = useQuery(api.github.installations.listInstallations);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
          Connect
        </p>
        <h1 className="text-2xl font-medium tracking-tight text-white">
          Set up tracking
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Install the GitHub App, then choose which repositories Hermes should
          analyze.
        </p>
      </div>

      {installations === undefined ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      ) : installations.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-8 text-center">
          <GitBranch className="mx-auto mb-3 h-6 w-6 text-zinc-400" />
          <p className="mb-4 text-sm text-zinc-400">
            No GitHub organizations connected yet.
          </p>
          <div className="flex justify-center">
            <InstallGitHubApp />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {installations.map((inst) => (
            <div key={inst._id}>
              <div className="mb-3 flex items-center gap-2">
                <img
                  src={inst.accountAvatarUrl || undefined}
                  alt={inst.accountLogin}
                  className="h-6 w-6 rounded-full bg-zinc-800"
                />
                <span className="text-sm font-medium text-white">
                  {inst.accountLogin}
                </span>
                <span className="text-[10px] font-mono text-zinc-600">
                  {inst.accountType}
                </span>
              </div>
              <RepoSelector installationId={inst._id} />
            </div>
          ))}
          <div className="pt-2">
            <InstallGitHubApp label="Add another org" />
          </div>
        </div>
      )}
    </div>
  );
}
