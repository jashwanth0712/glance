import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

// Ensures the signed-in user owns the repo before returning data.
async function assertRepoAccess(
  ctx: { db: import("../_generated/server").QueryCtx["db"]; auth: import("../_generated/server").QueryCtx["auth"] },
  repositoryId: Id<"repositories">,
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const repo = await ctx.db.get(repositoryId);
  if (!repo) return null;
  const installation = await ctx.db.get(repo.installationId);
  if (!installation || installation.convexUserId !== userId) return null;
  return repo;
}

/** Functionality units for a repo, most recently updated first. */
export const listFunctionalityUnits = query({
  args: {
    repositoryId: v.id("repositories"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { repositoryId, limit }) => {
    const repo = await assertRepoAccess(ctx, repositoryId);
    if (!repo) return [];
    return await ctx.db
      .query("functionalityUnits")
      .withIndex("by_repo_updated", (q) => q.eq("repositoryId", repositoryId))
      .order("desc")
      .take(limit ?? 100);
  },
});

/** Recent classified PRs for the live feed. */
export const listRecentPRs = query({
  args: {
    repositoryId: v.id("repositories"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { repositoryId, limit }) => {
    const repo = await assertRepoAccess(ctx, repositoryId);
    if (!repo) return [];
    const prs = await ctx.db
      .query("pullRequests")
      .withIndex("by_repo", (q) => q.eq("repositoryId", repositoryId))
      .order("desc")
      .take(limit ?? 50);
    return await Promise.all(
      prs.map(async (pr) => {
        const cls = await ctx.db
          .query("classifications")
          .withIndex("by_pr", (q) => q.eq("prId", pr._id))
          .unique();
        return { ...pr, categories: cls?.categories ?? [], reasoning: cls?.reasoning };
      }),
    );
  },
});

// UTC-Monday week start for a timestamp, used to bucket changes into weeks.
function weekStartOf(ts: number): number {
  const d = new Date(ts);
  const mondayOffset = (d.getUTCDay() + 6) % 7; // Sun=6 … Mon=0
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() - mondayOffset,
  );
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CATEGORIES = [
  "end_user_features",
  "admin_support",
  "performance",
  "cost_improvement",
  "tech_debt",
] as const;

type CatCounts = Record<string, number>;
const emptyCounts = (): CatCounts =>
  Object.fromEntries(CATEGORIES.map((c) => [c, 0]));

/**
 * Weekly + per-contributor category breakdown for the trend visualizations.
 * Each classified change is bucketed by the underlying PR/commit authored
 * time (createdAtGh / committedAt), counting once per tagged category.
 */
export const getCategoryTrends = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    const repo = await assertRepoAccess(ctx, repositoryId);
    if (!repo) return null;

    const classifications = await ctx.db
      .query("classifications")
      .withIndex("by_repo", (q) => q.eq("repositoryId", repositoryId))
      .take(5000);

    const weekMap = new Map<number, CatCounts>();
    const contribMap = new Map<
      string,
      { login: string; avatarUrl: string; counts: CatCounts; total: number }
    >();

    for (const c of classifications) {
      // Resolve the source's authored timestamp + author.
      let ts: number | null = null;
      let login: string | null = null;
      let avatarUrl = "";
      if (c.prId) {
        const pr = await ctx.db.get(c.prId);
        if (pr) {
          ts = pr.createdAtGh;
          login = pr.authorLogin;
          avatarUrl = pr.authorAvatarUrl;
        }
      } else if (c.commitId) {
        const commit = await ctx.db.get(c.commitId);
        if (commit) {
          ts = commit.committedAt;
          login = commit.authorLogin ?? commit.authorEmail;
          avatarUrl = commit.authorAvatarUrl ?? "";
        }
      }
      if (ts === null) continue;

      const wk = weekStartOf(ts);
      let bucket = weekMap.get(wk);
      if (!bucket) {
        bucket = emptyCounts();
        weekMap.set(wk, bucket);
      }

      let contrib = login ? contribMap.get(login) : undefined;
      if (login && !contrib) {
        contrib = { login, avatarUrl, counts: emptyCounts(), total: 0 };
        contribMap.set(login, contrib);
      }

      for (const cat of c.categories) {
        bucket[cat] = (bucket[cat] ?? 0) + 1;
        if (contrib) {
          contrib.counts[cat] = (contrib.counts[cat] ?? 0) + 1;
          contrib.total += 1;
        }
      }
    }

    // Emit a contiguous week series (fill empty weeks) so the axis is even.
    const weekKeys = Array.from(weekMap.keys()).sort((a, b) => a - b);
    const weeks: Array<{ weekStart: number } & CatCounts> = [];
    if (weekKeys.length > 0) {
      const first = weekKeys[0];
      const last = weekKeys[weekKeys.length - 1];
      for (let wk = first; wk <= last; wk += WEEK_MS) {
        weeks.push({ weekStart: wk, ...(weekMap.get(wk) ?? emptyCounts()) });
      }
    }

    const contributors = Array.from(contribMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    return { weeks, contributors, totalClassified: classifications.length };
  },
});

/** Rollup stats for a repo: counts per category + pipeline progress. */
export const getRepoStats = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    const repo = await assertRepoAccess(ctx, repositoryId);
    if (!repo) return null;

    const classifications = await ctx.db
      .query("classifications")
      .withIndex("by_repo", (q) => q.eq("repositoryId", repositoryId))
      .take(5000);

    const categoryCounts: Record<string, number> = {
      end_user_features: 0,
      admin_support: 0,
      performance: 0,
      cost_improvement: 0,
      tech_debt: 0,
    };
    for (const c of classifications) {
      for (const cat of c.categories) {
        categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
      }
    }

    const units = await ctx.db
      .query("functionalityUnits")
      .withIndex("by_repo", (q) => q.eq("repositoryId", repositoryId))
      .take(1000);

    // Count anything still moving through the pipeline.
    const pendingPrs = await ctx.db
      .query("pullRequests")
      .withIndex("by_repo_status", (q) =>
        q.eq("repositoryId", repositoryId).eq("processingStatus", "raw"),
      )
      .take(500);

    return {
      backfillStatus: repo.backfillStatus,
      categoryCounts,
      totalClassified: classifications.length,
      totalUnits: units.length,
      pendingCount: pendingPrs.length,
      lastSyncedAt: repo.lastSyncedAt,
    };
  },
});
