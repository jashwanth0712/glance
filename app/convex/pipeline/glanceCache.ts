import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";

/** Look up a cached narrative by repo + window + content hash. */
export const getCachedSummary = internalQuery({
  args: {
    repositoryId: v.id("repositories"),
    windowKey: v.string(),
    contentHash: v.string(),
  },
  handler: async (ctx, { repositoryId, windowKey, contentHash }) => {
    const row = await ctx.db
      .query("glanceSummaries")
      .withIndex("by_repo_window_hash", (q) =>
        q
          .eq("repositoryId", repositoryId)
          .eq("windowKey", windowKey)
          .eq("contentHash", contentHash),
      )
      .unique();
    return row?.narrative ?? null;
  },
});

/** Upsert the cached narrative for a repo + window (one row per window). */
export const saveGlanceSummary = internalMutation({
  args: {
    repositoryId: v.id("repositories"),
    windowKey: v.string(),
    contentHash: v.string(),
    narrative: v.string(),
    model: v.string(),
    classifiedCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("glanceSummaries")
      .withIndex("by_repo_window", (q) =>
        q.eq("repositoryId", args.repositoryId).eq("windowKey", args.windowKey),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    await ctx.db.insert("glanceSummaries", {
      ...args,
      generatedAt: Date.now(),
    });
  },
});
