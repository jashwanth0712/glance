import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

// ── Webhook event log (dedupe + debugging) ────────────────────────────────

export const logWebhookEvent = internalMutation({
  args: {
    deliveryId: v.string(),
    event: v.string(),
    action: v.optional(v.string()),
    installationId: v.optional(v.number()),
    repoFullName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Dedupe on delivery id — GitHub retries deliveries.
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_delivery", (q) => q.eq("deliveryId", args.deliveryId))
      .unique();
    if (existing) return { alreadyProcessed: existing.processed };
    await ctx.db.insert("webhookEvents", {
      ...args,
      processed: false,
      receivedAt: Date.now(),
    });
    return { alreadyProcessed: false };
  },
});

export const markWebhookProcessed = internalMutation({
  args: { deliveryId: v.string() },
  handler: async (ctx, { deliveryId }) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_delivery", (q) => q.eq("deliveryId", deliveryId))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { processed: true });
  },
});

// ── Installation lifecycle ────────────────────────────────────────────────

export const handleInstallation = internalMutation({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: { action: v.string(), payload: v.any() },
  handler: async (ctx, { action, payload }) => {
    const installationId: number = payload.installation.id;
    const existing = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) =>
        q.eq("installationId", installationId),
      )
      .unique();
    if (!existing) return;
    if (action === "suspend" || action === "deleted") {
      await ctx.db.patch(existing._id, { suspendedAt: Date.now() });
    } else if (action === "unsuspend") {
      await ctx.db.patch(existing._id, { suspendedAt: undefined });
    }
  },
});

export const handleInstallationRepositories = internalMutation({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: { action: v.string(), payload: v.any() },
  handler: async (ctx, { action, payload }) => {
    // When repos are removed from the installation, stop tracking them.
    if (action === "removed") {
      const removed: Array<{ id: number }> =
        payload.repositories_removed ?? [];
      for (const r of removed) {
        const repo = await ctx.db
          .query("repositories")
          .withIndex("by_github_repo_id", (q) =>
            q.eq("githubRepoId", r.id),
          )
          .unique();
        if (repo) await ctx.db.delete(repo._id);
      }
    }
    // Newly added repos are surfaced in the onboarding UI; we don't
    // auto-track them until the user picks a backfill mode.
  },
});

// ── Push / pull_request events ────────────────────────────────────────────

export const handlePushEvent = internalMutation({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: { payload: v.any() },
  handler: async (ctx, { payload }) => {
    const repo = await ctx.db
      .query("repositories")
      .withIndex("by_github_repo_id", (q) =>
        q.eq("githubRepoId", payload.repository.id),
      )
      .unique();
    if (!repo) return; // repo not tracked

    // Only process pushes to the default branch.
    if (payload.ref !== `refs/heads/${repo.defaultBranch}`) return;

    const commits: Array<{
      id: string;
      message: string;
      url: string;
      timestamp: string;
      author: { name: string; email: string; username?: string };
    }> = payload.commits ?? [];

    let ingested = false;
    for (const c of commits) {
      // Skip PR merge commits — the PR itself represents that work.
      if (c.message.startsWith("Merge pull request #")) continue;
      const inserted = await upsertCommitInternal(ctx, {
        repositoryId: repo._id,
        sha: c.id,
        message: c.message.split("\n")[0].slice(0, 500),
        fullMessage: c.message.slice(0, 4000),
        authorLogin: c.author.username,
        authorEmail: c.author.email,
        htmlUrl: c.url,
        committedAt: new Date(c.timestamp).getTime(),
      });
      ingested = ingested || inserted;
    }
    if (ingested) {
      await ctx.scheduler.runAfter(
        0,
        internal.pipeline.orchestrator.enqueueClassification,
        { repositoryId: repo._id },
      );
    }
  },
});

export const handlePullRequestEvent = internalMutation({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: { action: v.string(), payload: v.any() },
  handler: async (ctx, { action, payload }) => {
    // We only care about states that represent real, reviewable work.
    if (!["opened", "closed", "reopened", "edited"].includes(action)) return;
    const repo = await ctx.db
      .query("repositories")
      .withIndex("by_github_repo_id", (q) =>
        q.eq("githubRepoId", payload.repository.id),
      )
      .unique();
    if (!repo) return;

    const pr = payload.pull_request;
    const merged: boolean = pr.merged === true;
    const inserted = await upsertPullRequestInternal(ctx, {
      repositoryId: repo._id,
      prNumber: pr.number,
      title: pr.title,
      body: pr.body ?? undefined,
      state: merged ? "merged" : pr.state === "open" ? "open" : "closed",
      mergedAt: pr.merged_at ? new Date(pr.merged_at).getTime() : undefined,
      authorLogin: pr.user?.login ?? "unknown",
      authorAvatarUrl: pr.user?.avatar_url ?? "",
      htmlUrl: pr.html_url,
      labels: (pr.labels ?? []).map((l: { name: string }) => l.name),
      createdAtGh: new Date(pr.created_at).getTime(),
      updatedAtGh: new Date(pr.updated_at).getTime(),
    });
    if (inserted) {
      await ctx.scheduler.runAfter(
        0,
        internal.pipeline.orchestrator.enqueueClassification,
        { repositoryId: repo._id },
      );
    }
  },
});

// ── Shared upsert helpers (used by webhooks and backfill) ─────────────────

type UpsertPrArgs = {
  repositoryId: Id<"repositories">;
  prNumber: number;
  title: string;
  body?: string;
  state: "open" | "closed" | "merged";
  mergedAt?: number;
  authorLogin: string;
  authorAvatarUrl: string;
  htmlUrl: string;
  labels: string[];
  createdAtGh: number;
  updatedAtGh: number;
};

// Returns true if a new row was inserted (so the caller can enqueue work).
async function upsertPullRequestInternal(
  ctx: { db: import("../_generated/server").MutationCtx["db"] },
  args: UpsertPrArgs,
): Promise<boolean> {
  const existing = await ctx.db
    .query("pullRequests")
    .withIndex("by_repo_pr_number", (q) =>
      q.eq("repositoryId", args.repositoryId).eq("prNumber", args.prNumber),
    )
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, {
      title: args.title,
      body: args.body,
      state: args.state,
      mergedAt: args.mergedAt,
      labels: args.labels,
      updatedAtGh: args.updatedAtGh,
    });
    return false;
  }
  await ctx.db.insert("pullRequests", {
    ...args,
    processingStatus: "raw",
    classificationAttempts: 0,
    ingestedAt: Date.now(),
  });
  return true;
}

type UpsertCommitArgs = {
  repositoryId: Id<"repositories">;
  sha: string;
  message: string;
  fullMessage?: string;
  authorLogin?: string;
  authorAvatarUrl?: string;
  authorEmail: string;
  htmlUrl: string;
  committedAt: number;
  isPrCommit?: boolean;
  prId?: Id<"pullRequests">;
};

async function upsertCommitInternal(
  ctx: { db: import("../_generated/server").MutationCtx["db"] },
  args: UpsertCommitArgs,
): Promise<boolean> {
  const existing = await ctx.db
    .query("commits")
    .withIndex("by_sha", (q) =>
      q.eq("repositoryId", args.repositoryId).eq("sha", args.sha),
    )
    .unique();
  if (existing) return false;
  await ctx.db.insert("commits", {
    repositoryId: args.repositoryId,
    sha: args.sha,
    shortSha: args.sha.slice(0, 7),
    message: args.message,
    fullMessage: args.fullMessage,
    authorLogin: args.authorLogin,
    authorAvatarUrl: args.authorAvatarUrl,
    authorEmail: args.authorEmail,
    htmlUrl: args.htmlUrl,
    committedAt: args.committedAt,
    isPrCommit: args.isPrCommit ?? false,
    prId: args.prId,
    processingStatus: "raw",
    classificationAttempts: 0,
    ingestedAt: Date.now(),
  });
  return true;
}

// Public-to-backend upsert wrappers callable from Node ingest actions.
export const upsertPullRequest = internalMutation({
  args: {
    repositoryId: v.id("repositories"),
    prNumber: v.number(),
    title: v.string(),
    body: v.optional(v.string()),
    state: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("merged"),
    ),
    mergedAt: v.optional(v.number()),
    authorLogin: v.string(),
    authorAvatarUrl: v.string(),
    htmlUrl: v.string(),
    labels: v.array(v.string()),
    createdAtGh: v.number(),
    updatedAtGh: v.number(),
  },
  handler: async (ctx, args) => upsertPullRequestInternal(ctx, args),
});

export const upsertCommit = internalMutation({
  args: {
    repositoryId: v.id("repositories"),
    sha: v.string(),
    message: v.string(),
    fullMessage: v.optional(v.string()),
    authorLogin: v.optional(v.string()),
    authorAvatarUrl: v.optional(v.string()),
    authorEmail: v.string(),
    htmlUrl: v.string(),
    committedAt: v.number(),
    isPrCommit: v.optional(v.boolean()),
    prId: v.optional(v.id("pullRequests")),
  },
  handler: async (ctx, args) => upsertCommitInternal(ctx, args),
});

// Read helper used by ingest actions to resume from a cursor.
export const getRepoById = internalQuery({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => ctx.db.get(repositoryId),
});
