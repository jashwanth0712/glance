"use node";

import { action, internalAction } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
  getInstallationOctokit,
  getInstallationAccount,
  listInstallationRepos,
} from "./octokit";

const PAGE_SIZE = 100;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Public action: lists repos accessible to an installation, marking which
 * are already tracked. Auth is enforced via the user-scoped installations
 * query.
 */
export const listAvailableRepos = action({
  args: { installationId: v.id("githubInstallations") },
  handler: async (ctx, { installationId }) => {
    const installations: Array<Doc<"githubInstallations">> =
      await ctx.runQuery(api.github.installations.listInstallations, {});
    const installation = installations.find((i) => i._id === installationId);
    if (!installation) throw new Error("Installation not found");

    const repos = await listInstallationRepos(installation.installationId);
    const tracked: Array<Doc<"repositories">> = await ctx.runQuery(
      api.github.repositories.listTrackedRepos,
      { installationId },
    );
    const trackedIds = new Set(tracked.map((r) => r.githubRepoId));
    return repos.map((r) => ({
      ...r,
      tracked: trackedIds.has(r.githubRepoId),
    }));
  },
});

/**
 * Public action called from the post-install callback: resolves the
 * installation's account details and records it for the signed-in user.
 */
export const registerInstallation = action({
  args: { installationId: v.number() },
  handler: async (ctx, { installationId }): Promise<string> => {
    const account = await getInstallationAccount(installationId);
    const id: string = await ctx.runMutation(
      api.github.installations.upsertInstallation,
      {
        installationId,
        accountLogin: account.login,
        accountType: account.type,
        accountAvatarUrl: account.avatarUrl,
      },
    );
    return id;
  },
});

// ── Backfill orchestration ────────────────────────────────────────────────

export const startBackfill = internalAction({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    const data = await ctx.runQuery(
      internal.github.repositories.getRepoWithInstallation,
      { repositoryId },
    );
    if (!data?.repo || !data.installation) return;
    const { repo, installation } = data;

    await ctx.runMutation(internal.github.repositories.patchRepoSync, {
      repositoryId,
      backfillStatus: "in_progress",
    });

    if (repo.backfillMode === "none") {
      // Record the current tip so catch-up only sees future activity.
      const octokit = await getInstallationOctokit(installation.installationId);
      const { data: prs } = await octokit.request(
        "GET /repos/{owner}/{repo}/pulls",
        {
          owner: repo.owner,
          repo: repo.name,
          state: "all",
          sort: "created",
          direction: "desc",
          per_page: 1,
        },
      );
      const { data: commits } = await octokit.request(
        "GET /repos/{owner}/{repo}/commits",
        { owner: repo.owner, repo: repo.name, sha: repo.defaultBranch, per_page: 1 },
      );
      await ctx.runMutation(internal.github.repositories.patchRepoSync, {
        repositoryId,
        backfillStatus: "done",
        lastPrNumber: prs[0]?.number ?? 0,
        lastCommitCursor: commits[0]?.sha,
        lastSyncedAt: Date.now(),
      });
      return;
    }

    const sinceMs =
      repo.backfillMode === "7days" ? Date.now() - SEVEN_DAYS_MS : undefined;
    await ctx.scheduler.runAfter(0, internal.github.ingest.backfillPrsPage, {
      repositoryId,
      page: 1,
      sinceMs,
      maxPrNumber: 0,
    });
  },
});

export const backfillPrsPage = internalAction({
  args: {
    repositoryId: v.id("repositories"),
    page: v.number(),
    sinceMs: v.optional(v.number()),
    maxPrNumber: v.number(),
  },
  handler: async (ctx, { repositoryId, page, sinceMs, maxPrNumber }) => {
    const data = await ctx.runQuery(
      internal.github.repositories.getRepoWithInstallation,
      { repositoryId },
    );
    if (!data?.repo || !data.installation) return;
    const { repo, installation } = data;
    const octokit = await getInstallationOctokit(installation.installationId);

    const { data: prs } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls",
      {
        owner: repo.owner,
        repo: repo.name,
        state: "all",
        sort: "created",
        direction: "desc",
        per_page: PAGE_SIZE,
        page,
      },
    );

    let nextMax = maxPrNumber;
    let reachedCutoff = false;
    let ingestedAny = false;
    for (const pr of prs) {
      const createdMs = new Date(pr.created_at).getTime();
      if (sinceMs && createdMs < sinceMs) {
        reachedCutoff = true;
        break;
      }
      nextMax = Math.max(nextMax, pr.number);
      const inserted = await ctx.runMutation(
        internal.github.webhookHandler.upsertPullRequest,
        {
          repositoryId,
          prNumber: pr.number,
          title: pr.title,
          body: pr.body ?? undefined,
          state: pr.merged_at
            ? "merged"
            : pr.state === "open"
              ? "open"
              : "closed",
          mergedAt: pr.merged_at
            ? new Date(pr.merged_at).getTime()
            : undefined,
          authorLogin: pr.user?.login ?? "unknown",
          authorAvatarUrl: pr.user?.avatar_url ?? "",
          htmlUrl: pr.html_url,
          labels: (pr.labels ?? []).map((l) =>
            typeof l === "string" ? l : (l.name ?? ""),
          ),
          createdAtGh: createdMs,
          updatedAtGh: new Date(pr.updated_at).getTime(),
        },
      );
      ingestedAny = ingestedAny || inserted;
    }

    if (ingestedAny) {
      await ctx.runMutation(
        internal.pipeline.orchestrator.enqueueClassification,
        { repositoryId },
      );
    }

    const done = reachedCutoff || prs.length < PAGE_SIZE;
    if (done) {
      await ctx.runMutation(internal.github.repositories.patchRepoSync, {
        repositoryId,
        lastPrNumber: nextMax,
      });
      // Chain into commit backfill.
      const sinceIso = sinceMs ? new Date(sinceMs).toISOString() : undefined;
      await ctx.scheduler.runAfter(
        0,
        internal.github.ingest.backfillCommitsPage,
        { repositoryId, page: 1, sinceIso, cursor: undefined },
      );
    } else {
      await ctx.scheduler.runAfter(0, internal.github.ingest.backfillPrsPage, {
        repositoryId,
        page: page + 1,
        sinceMs,
        maxPrNumber: nextMax,
      });
    }
  },
});

export const backfillCommitsPage = internalAction({
  args: {
    repositoryId: v.id("repositories"),
    page: v.number(),
    sinceIso: v.optional(v.string()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { repositoryId, page, sinceIso, cursor }) => {
    const data = await ctx.runQuery(
      internal.github.repositories.getRepoWithInstallation,
      { repositoryId },
    );
    if (!data?.repo || !data.installation) return;
    const { repo, installation } = data;
    const octokit = await getInstallationOctokit(installation.installationId);

    const { data: commits } = await octokit.request(
      "GET /repos/{owner}/{repo}/commits",
      {
        owner: repo.owner,
        repo: repo.name,
        sha: repo.defaultBranch,
        per_page: PAGE_SIZE,
        page,
        ...(sinceIso ? { since: sinceIso } : {}),
      },
    );

    const newCursor = page === 1 && commits[0] ? commits[0].sha : cursor;
    let ingestedAny = false;
    for (const c of commits) {
      const message = c.commit.message;
      if (message.startsWith("Merge pull request #")) continue;
      const inserted = await ctx.runMutation(
        internal.github.webhookHandler.upsertCommit,
        {
          repositoryId,
          sha: c.sha,
          message: message.split("\n")[0].slice(0, 500),
          fullMessage: message.slice(0, 4000),
          authorLogin: c.author?.login ?? undefined,
          authorAvatarUrl: c.author?.avatar_url ?? undefined,
          authorEmail: c.commit.author?.email ?? "",
          htmlUrl: c.html_url,
          committedAt: new Date(
            c.commit.author?.date ?? c.commit.committer?.date ?? Date.now(),
          ).getTime(),
        },
      );
      ingestedAny = ingestedAny || inserted;
    }

    if (ingestedAny) {
      await ctx.runMutation(
        internal.pipeline.orchestrator.enqueueClassification,
        { repositoryId },
      );
    }

    if (commits.length < PAGE_SIZE) {
      await ctx.runMutation(internal.github.repositories.patchRepoSync, {
        repositoryId,
        backfillStatus: "done",
        lastCommitCursor: newCursor,
        lastSyncedAt: Date.now(),
      });
    } else {
      await ctx.scheduler.runAfter(
        0,
        internal.github.ingest.backfillCommitsPage,
        { repositoryId, page: page + 1, sinceIso, cursor: newCursor },
      );
    }
  },
});

// ── Catch-up (cron safety net) ────────────────────────────────────────────

export const catchUpAllRepos = internalAction({
  args: {},
  handler: async (ctx) => {
    const repos = await ctx.runQuery(
      internal.github.repositories.listActiveRepos,
      {},
    );
    for (const repo of repos) {
      await ctx.scheduler.runAfter(0, internal.github.ingest.catchUpRepo, {
        repositoryId: repo._id,
      });
    }
  },
});

export const catchUpRepo = internalAction({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    const data = await ctx.runQuery(
      internal.github.repositories.getRepoWithInstallation,
      { repositoryId },
    );
    if (!data?.repo || !data.installation) return;
    const { repo, installation } = data;
    if (installation.suspendedAt) return;
    const octokit = await getInstallationOctokit(installation.installationId);

    // New PRs since the highest ingested number.
    const { data: prs } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls",
      {
        owner: repo.owner,
        repo: repo.name,
        state: "all",
        sort: "created",
        direction: "desc",
        per_page: PAGE_SIZE,
      },
    );
    let maxPr = repo.lastPrNumber ?? 0;
    let ingestedAny = false;
    for (const pr of prs) {
      if ((repo.lastPrNumber ?? 0) >= pr.number) break;
      maxPr = Math.max(maxPr, pr.number);
      const inserted = await ctx.runMutation(
        internal.github.webhookHandler.upsertPullRequest,
        {
          repositoryId,
          prNumber: pr.number,
          title: pr.title,
          body: pr.body ?? undefined,
          state: pr.merged_at
            ? "merged"
            : pr.state === "open"
              ? "open"
              : "closed",
          mergedAt: pr.merged_at
            ? new Date(pr.merged_at).getTime()
            : undefined,
          authorLogin: pr.user?.login ?? "unknown",
          authorAvatarUrl: pr.user?.avatar_url ?? "",
          htmlUrl: pr.html_url,
          labels: (pr.labels ?? []).map((l) =>
            typeof l === "string" ? l : (l.name ?? ""),
          ),
          createdAtGh: new Date(pr.created_at).getTime(),
          updatedAtGh: new Date(pr.updated_at).getTime(),
        },
      );
      ingestedAny = ingestedAny || inserted;
    }

    // New commits since the last cursor.
    const { data: commits } = await octokit.request(
      "GET /repos/{owner}/{repo}/commits",
      {
        owner: repo.owner,
        repo: repo.name,
        sha: repo.defaultBranch,
        per_page: PAGE_SIZE,
      },
    );
    let newCursor = repo.lastCommitCursor;
    for (let i = 0; i < commits.length; i++) {
      const c = commits[i];
      if (c.sha === repo.lastCommitCursor) break;
      if (i === 0) newCursor = c.sha;
      const message = c.commit.message;
      if (message.startsWith("Merge pull request #")) continue;
      const inserted = await ctx.runMutation(
        internal.github.webhookHandler.upsertCommit,
        {
          repositoryId,
          sha: c.sha,
          message: message.split("\n")[0].slice(0, 500),
          fullMessage: message.slice(0, 4000),
          authorLogin: c.author?.login ?? undefined,
          authorAvatarUrl: c.author?.avatar_url ?? undefined,
          authorEmail: c.commit.author?.email ?? "",
          htmlUrl: c.html_url,
          committedAt: new Date(
            c.commit.author?.date ?? c.commit.committer?.date ?? Date.now(),
          ).getTime(),
        },
      );
      ingestedAny = ingestedAny || inserted;
    }

    await ctx.runMutation(internal.github.repositories.patchRepoSync, {
      repositoryId,
      lastPrNumber: maxPr,
      lastCommitCursor: newCursor,
      lastSyncedAt: Date.now(),
    });

    // Re-drive the pipeline for anything still pending (missed webhooks, etc.).
    await ctx.runMutation(
      internal.pipeline.orchestrator.enqueueClassification,
      { repositoryId },
    );
  },
});
