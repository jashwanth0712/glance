import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

// Ensures the signed-in user owns the repo before returning data.
async function assertRepoAccess(
  ctx: {
    db: import("../_generated/server").QueryCtx["db"];
    auth: import("../_generated/server").QueryCtx["auth"];
  },
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

const DAY_MS = 24 * 60 * 60 * 1000;
export const WINDOW_MS: Record<string, number> = {
  "3d": 3 * DAY_MS,
  "1w": 7 * DAY_MS,
  "1m": 30 * DAY_MS,
  "3m": 90 * DAY_MS,
};

// Cap scans so a huge 3-month window on a busy repo stays under Convex's
// per-query time budget. A Glance is a summary, not an exhaustive audit.
const SCAN_CAP = 500;

// Cosine similarity of two equal-length numeric vectors.
function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function alignmentLabelFor(score: number): string {
  if (score >= 85) return "Highly aligned";
  if (score >= 65) return "Moderately aligned";
  if (score >= 40) return "Diverging";
  return "Working in silos";
}

/**
 * A time-windowed "Glance" snapshot for one repo: what kind of work went in,
 * who contributed, the top themes, and a team-alignment signal. Only classified
 * items are counted; unclassified items in the window surface as pendingCount.
 */
export const getGlanceData = query({
  args: {
    repositoryId: v.id("repositories"),
    windowKey: v.union(
      v.literal("3d"),
      v.literal("1w"),
      v.literal("1m"),
      v.literal("3m"),
    ),
  },
  handler: async (ctx, { repositoryId, windowKey }) => {
    const repo = await assertRepoAccess(ctx, repositoryId);
    if (!repo) return null;

    const nowMs = Date.now();
    const sinceMs = nowMs - WINDOW_MS[windowKey];

    // ── Pull PRs + commits authored inside the window (bounded range scans) ──
    const prs = await ctx.db
      .query("pullRequests")
      .withIndex("by_repo_created", (q) =>
        q
          .eq("repositoryId", repositoryId)
          .gte("createdAtGh", sinceMs)
          .lte("createdAtGh", nowMs),
      )
      .take(SCAN_CAP);

    const commitsAll = await ctx.db
      .query("commits")
      .withIndex("by_repo_committed", (q) =>
        q
          .eq("repositoryId", repositoryId)
          .gte("committedAt", sinceMs)
          .lte("committedAt", nowMs),
      )
      .take(SCAN_CAP);
    // Skip commits that belong to a PR — the PR already represents that work.
    const commits = commitsAll.filter((c) => !c.isPrCommit);

    const capped = prs.length >= SCAN_CAP || commitsAll.length >= SCAN_CAP;

    const categoryCounts = emptyCounts();
    const contribMap = new Map<
      string,
      { login: string; avatarUrl: string; counts: CatCounts; total: number }
    >();
    let classifiedCount = 0;
    let pendingCount = 0;

    // In-window item ids, used to find which functionality units were touched.
    const inWindowPrIds: Id<"pullRequests">[] = [];
    const inWindowCommitIds: Id<"commits">[] = [];

    const fold = (
      categories: string[],
      login: string,
      avatarUrl: string,
    ) => {
      let contrib = contribMap.get(login);
      if (!contrib) {
        contrib = { login, avatarUrl, counts: emptyCounts(), total: 0 };
        contribMap.set(login, contrib);
      }
      for (const cat of categories) {
        categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
        contrib.counts[cat] = (contrib.counts[cat] ?? 0) + 1;
        contrib.total += 1;
      }
    };

    for (const pr of prs) {
      inWindowPrIds.push(pr._id);
      const cls = await ctx.db
        .query("classifications")
        .withIndex("by_pr", (q) => q.eq("prId", pr._id))
        .unique();
      if (cls) {
        classifiedCount += 1;
        fold(cls.categories, pr.authorLogin, pr.authorAvatarUrl);
      } else {
        pendingCount += 1;
      }
    }

    for (const commit of commits) {
      inWindowCommitIds.push(commit._id);
      const cls = await ctx.db
        .query("classifications")
        .withIndex("by_commit", (q) => q.eq("commitId", commit._id))
        .unique();
      if (cls) {
        classifiedCount += 1;
        fold(
          cls.categories,
          commit.authorLogin ?? commit.authorEmail,
          commit.authorAvatarUrl ?? "",
        );
      } else {
        pendingCount += 1;
      }
    }

    const contributors = Array.from(contribMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    // ── Alignment: how similar are contributors' category mixes? ────────────
    let alignmentScore: number | null = null;
    let alignmentLabel: string | null = null;
    const vectors = contributors
      .filter((c) => c.total > 0)
      .map((c) => CATEGORIES.map((cat) => (c.counts[cat] ?? 0) / c.total));
    if (vectors.length >= 2) {
      const centroid = CATEGORIES.map(
        (_, i) => vectors.reduce((s, v) => s + v[i], 0) / vectors.length,
      );
      const meanSim =
        vectors.reduce((s, v) => s + cosine(v, centroid), 0) / vectors.length;
      alignmentScore = Math.max(0, Math.min(100, Math.round(meanSim * 100)));
      alignmentLabel = alignmentLabelFor(alignmentScore);
    }

    // ── Top themes: functionality units touched by in-window items ──────────
    const unitActivity = new Map<Id<"functionalityUnits">, number>();
    const bumpUnit = (unitId: Id<"functionalityUnits">) =>
      unitActivity.set(unitId, (unitActivity.get(unitId) ?? 0) + 1);

    for (const prId of inWindowPrIds) {
      const members = await ctx.db
        .query("functionalityMembers")
        .withIndex("by_pr", (q) => q.eq("prId", prId))
        .collect();
      for (const m of members) bumpUnit(m.functionalityUnitId);
    }
    for (const commitId of inWindowCommitIds) {
      const members = await ctx.db
        .query("functionalityMembers")
        .withIndex("by_commit", (q) => q.eq("commitId", commitId))
        .collect();
      for (const m of members) bumpUnit(m.functionalityUnitId);
    }

    const topUnitIds = Array.from(unitActivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const topUnits = (
      await Promise.all(topUnitIds.map((id) => ctx.db.get(id)))
    )
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => ({
        _id: u._id,
        title: u.title,
        summary: u.summary,
        categories: u.categories,
        citations: u.citations,
        memberCount: u.memberCount,
        windowActivity: unitActivity.get(u._id) ?? 0,
      }));

    const totalTouchedUnits = unitActivity.size;

    return {
      sinceMs,
      nowMs,
      windowKey,
      classifiedCount,
      pendingCount,
      capped,
      categoryCounts,
      contributors,
      topUnits,
      totalTouchedUnits,
      alignmentScore,
      alignmentLabel,
    };
  },
});
