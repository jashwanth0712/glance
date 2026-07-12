import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/** Starts tracking a repo with the chosen backfill window. */
export const addRepository = mutation({
  args: {
    installationId: v.id("githubInstallations"),
    githubRepoId: v.number(),
    owner: v.string(),
    name: v.string(),
    fullName: v.string(),
    defaultBranch: v.string(),
    private: v.boolean(),
    backfillMode: v.union(
      v.literal("full"),
      v.literal("7days"),
      v.literal("none"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const installation = await ctx.db.get(args.installationId);
    if (!installation || installation.convexUserId !== userId) {
      throw new Error("Installation not found");
    }

    // Idempotent: don't double-track the same repo.
    const existing = await ctx.db
      .query("repositories")
      .withIndex("by_github_repo_id", (q) =>
        q.eq("githubRepoId", args.githubRepoId),
      )
      .unique();
    if (existing) return existing._id;

    const repositoryId = await ctx.db.insert("repositories", {
      installationId: args.installationId,
      githubRepoId: args.githubRepoId,
      owner: args.owner,
      name: args.name,
      fullName: args.fullName,
      defaultBranch: args.defaultBranch,
      private: args.private,
      backfillMode: args.backfillMode,
      backfillStatus: "pending",
      addedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.github.ingest.startBackfill, {
      repositoryId,
    });
    return repositoryId;
  },
});

/** Repos the user is tracking, optionally scoped to one installation. */
export const listTrackedRepos = query({
  args: { installationId: v.optional(v.id("githubInstallations")) },
  handler: async (ctx, { installationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (installationId) {
      const installation = await ctx.db.get(installationId);
      if (!installation || installation.convexUserId !== userId) return [];
      return await ctx.db
        .query("repositories")
        .withIndex("by_installation", (q) =>
          q.eq("installationId", installationId),
        )
        .collect();
    }

    // Across all of the user's installations.
    const installations = await ctx.db
      .query("githubInstallations")
      .withIndex("by_user", (q) => q.eq("convexUserId", userId))
      .collect();
    const repos = [];
    for (const inst of installations) {
      const r = await ctx.db
        .query("repositories")
        .withIndex("by_installation", (q) =>
          q.eq("installationId", inst._id),
        )
        .collect();
      repos.push(...r);
    }
    return repos;
  },
});

export const getRepo = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const repo = await ctx.db.get(repositoryId);
    if (!repo) return null;
    const installation = await ctx.db.get(repo.installationId);
    if (!installation || installation.convexUserId !== userId) return null;
    return repo;
  },
});

// ── Internal helpers used by the Node ingest actions ──────────────────────

export const getRepoWithInstallation = internalQuery({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    const repo = await ctx.db.get(repositoryId);
    if (!repo) return null;
    const installation = await ctx.db.get(repo.installationId);
    return { repo, installation };
  },
});

export const listActiveRepos = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("repositories")
      .withIndex("by_backfill_status", (q) => q.eq("backfillStatus", "done"))
      .collect();
  },
});

export const patchRepoSync = internalMutation({
  args: {
    repositoryId: v.id("repositories"),
    backfillStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("done"),
      ),
    ),
    lastPrNumber: v.optional(v.number()),
    lastCommitCursor: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
  },
  handler: async (ctx, { repositoryId, ...patch }) => {
    await ctx.db.patch(repositoryId, patch);
  },
});
