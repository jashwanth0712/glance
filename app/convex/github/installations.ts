import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Records (or refreshes) a GitHub App installation for the signed-in user.
 * Called from the Next.js post-install callback route.
 */
export const upsertInstallation = mutation({
  args: {
    installationId: v.number(),
    accountLogin: v.string(),
    accountType: v.union(v.literal("Organization"), v.literal("User")),
    accountAvatarUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) =>
        q.eq("installationId", args.installationId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        convexUserId: userId,
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        accountAvatarUrl: args.accountAvatarUrl,
        suspendedAt: undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert("githubInstallations", {
      installationId: args.installationId,
      accountLogin: args.accountLogin,
      accountType: args.accountType,
      accountAvatarUrl: args.accountAvatarUrl,
      convexUserId: userId,
      createdAt: Date.now(),
    });
  },
});

/** Lists installations connected by the current user. */
export const listInstallations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("githubInstallations")
      .withIndex("by_user", (q) => q.eq("convexUserId", userId))
      .collect();
  },
});
