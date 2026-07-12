import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  CLASSIFICATION_PROMPT_VERSION,
  GROUPING_PROMPT_VERSION,
} from "./prompts";

const CLASSIFY_BATCH = 15;
const GROUP_BATCH = 8;

// Build the citation object we store on functionality units.
function citationForPr(pr: Doc<"pullRequests">) {
  return {
    type: "pr" as const,
    prNumber: pr.prNumber,
    title: pr.title,
    htmlUrl: pr.htmlUrl,
    authorLogin: pr.authorLogin,
    authorAvatarUrl: pr.authorAvatarUrl,
    mergedAt: pr.mergedAt,
  };
}
function citationForCommit(c: Doc<"commits">) {
  return {
    type: "commit" as const,
    sha: c.sha,
    shortSha: c.shortSha,
    title: c.message,
    htmlUrl: c.htmlUrl,
    authorLogin: c.authorLogin,
    authorAvatarUrl: c.authorAvatarUrl,
  };
}

// ── Classification queue ──────────────────────────────────────────────────

export const enqueueClassification = internalMutation({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    const prs = await ctx.db
      .query("pullRequests")
      .withIndex("by_repo_status", (q) =>
        q.eq("repositoryId", repositoryId).eq("processingStatus", "raw"),
      )
      .take(CLASSIFY_BATCH);
    const remaining = CLASSIFY_BATCH - prs.length;
    const commits =
      remaining > 0
        ? await ctx.db
            .query("commits")
            .withIndex("by_repo_status", (q) =>
              q.eq("repositoryId", repositoryId).eq("processingStatus", "raw"),
            )
            .take(remaining)
        : [];

    if (prs.length === 0 && commits.length === 0) return;

    const repo = await ctx.db.get(repositoryId);
    if (!repo) return;
    const installation = await ctx.db.get(repo.installationId);
    if (!installation) return;

    const items = [
      ...prs.map((pr) => ({
        id: pr._id as string,
        kind: "pr" as const,
        prNumber: pr.prNumber,
        sha: undefined as string | undefined,
        title: pr.title,
        body: pr.body,
      })),
      ...commits.map((c) => ({
        id: c._id as string,
        kind: "commit" as const,
        prNumber: undefined as number | undefined,
        sha: c.sha,
        title: c.message,
        body: c.fullMessage,
      })),
    ];

    for (const pr of prs)
      await ctx.db.patch(pr._id, { processingStatus: "classifying" });
    for (const c of commits)
      await ctx.db.patch(c._id, { processingStatus: "classifying" });

    await ctx.scheduler.runAfter(0, internal.pipeline.classify.classifyBatch, {
      repositoryId,
      installationId: installation.installationId,
      owner: repo.owner,
      repo: repo.name,
      items,
    });
  },
});

export const markClassified = internalMutation({
  args: {
    repositoryId: v.id("repositories"),
    prId: v.optional(v.id("pullRequests")),
    commitId: v.optional(v.id("commits")),
    categories: v.array(v.string()),
    reasoning: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    // Dedupe classification rows.
    const existing = args.prId
      ? await ctx.db
          .query("classifications")
          .withIndex("by_pr", (q) => q.eq("prId", args.prId))
          .unique()
      : args.commitId
        ? await ctx.db
            .query("classifications")
            .withIndex("by_commit", (q) => q.eq("commitId", args.commitId))
            .unique()
        : null;
    if (!existing) {
      await ctx.db.insert("classifications", {
        prId: args.prId,
        commitId: args.commitId,
        repositoryId: args.repositoryId,
        // Categories validated at the model layer; cast to the union type.
        categories: args.categories as Doc<"classifications">["categories"],
        reasoning: args.reasoning,
        model: args.model,
        promptVersion: CLASSIFICATION_PROMPT_VERSION,
        classifiedAt: Date.now(),
      });
    }
    if (args.prId)
      await ctx.db.patch(args.prId, { processingStatus: "classified" });
    if (args.commitId)
      await ctx.db.patch(args.commitId, { processingStatus: "classified" });
  },
});

export const markError = internalMutation({
  args: {
    prId: v.optional(v.id("pullRequests")),
    commitId: v.optional(v.id("commits")),
  },
  handler: async (ctx, { prId, commitId }) => {
    const doc = prId
      ? await ctx.db.get(prId)
      : commitId
        ? await ctx.db.get(commitId)
        : null;
    if (!doc) return;
    const attempts = doc.classificationAttempts + 1;
    const status = attempts >= 3 ? "error" : "raw";
    const id = (prId ?? commitId)!;
    await ctx.db.patch(id, {
      classificationAttempts: attempts,
      processingStatus: status,
    });
  },
});

// ── Grouping queue ────────────────────────────────────────────────────────

export const enqueueGrouping = internalMutation({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, { repositoryId }) => {
    const prs = await ctx.db
      .query("pullRequests")
      .withIndex("by_repo_status", (q) =>
        q.eq("repositoryId", repositoryId).eq("processingStatus", "classified"),
      )
      .take(GROUP_BATCH);
    const remaining = GROUP_BATCH - prs.length;
    const commits =
      remaining > 0
        ? await ctx.db
            .query("commits")
            .withIndex("by_repo_status", (q) =>
              q
                .eq("repositoryId", repositoryId)
                .eq("processingStatus", "classified"),
            )
            .take(remaining)
        : [];

    if (prs.length === 0 && commits.length === 0) return;

    // Load categories + citation for each item.
    const items = [];
    for (const pr of prs) {
      const cls = await ctx.db
        .query("classifications")
        .withIndex("by_pr", (q) => q.eq("prId", pr._id))
        .unique();
      items.push({
        id: pr._id as string,
        kind: "pr" as const,
        title: pr.title,
        categories: cls?.categories ?? [],
        citation: citationForPr(pr),
      });
      await ctx.db.patch(pr._id, { processingStatus: "grouping" });
    }
    for (const c of commits) {
      const cls = await ctx.db
        .query("classifications")
        .withIndex("by_commit", (q) => q.eq("commitId", c._id))
        .unique();
      items.push({
        id: c._id as string,
        kind: "commit" as const,
        title: c.message,
        categories: cls?.categories ?? [],
        citation: citationForCommit(c),
      });
      await ctx.db.patch(c._id, { processingStatus: "grouping" });
    }

    // Existing units for context (most recently updated first).
    const existingUnits = await ctx.db
      .query("functionalityUnits")
      .withIndex("by_repo_updated", (q) => q.eq("repositoryId", repositoryId))
      .order("desc")
      .take(50);

    await ctx.scheduler.runAfter(
      0,
      internal.pipeline.group.assignToFunctionalityUnit,
      {
        repositoryId,
        items,
        existingUnits: existingUnits.map((u) => ({
          id: u._id as string,
          title: u.title,
          summary: u.summary,
        })),
      },
    );
  },
});

export const createFunctionalityUnit = internalMutation({
  args: {
    repositoryId: v.id("repositories"),
    title: v.string(),
    summary: v.string(),
    categories: v.array(v.string()),
    model: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"functionalityUnits">> => {
    return await ctx.db.insert("functionalityUnits", {
      repositoryId: args.repositoryId,
      title: args.title,
      summary: args.summary,
      categories: args.categories as Doc<"functionalityUnits">["categories"],
      citations: [],
      memberCount: 0,
      lastUpdatedAt: Date.now(),
      model: args.model,
      promptVersion: GROUPING_PROMPT_VERSION,
      createdAt: Date.now(),
    });
  },
});

export const markGrouped = internalMutation({
  args: {
    functionalityUnitId: v.id("functionalityUnits"),
    repositoryId: v.id("repositories"),
    prId: v.optional(v.id("pullRequests")),
    commitId: v.optional(v.id("commits")),
    categories: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Dedupe membership.
    const existingMember = args.prId
      ? await ctx.db
          .query("functionalityMembers")
          .withIndex("by_pr", (q) => q.eq("prId", args.prId))
          .unique()
      : args.commitId
        ? await ctx.db
            .query("functionalityMembers")
            .withIndex("by_commit", (q) => q.eq("commitId", args.commitId))
            .unique()
        : null;

    const unit = await ctx.db.get(args.functionalityUnitId);
    if (!unit) return;

    if (!existingMember) {
      await ctx.db.insert("functionalityMembers", {
        functionalityUnitId: args.functionalityUnitId,
        repositoryId: args.repositoryId,
        prId: args.prId,
        commitId: args.commitId,
        assignedAt: Date.now(),
      });

      const citation = args.prId
        ? citationForPr((await ctx.db.get(args.prId))!)
        : citationForCommit((await ctx.db.get(args.commitId!))!);
      const mergedCategories = Array.from(
        new Set([...unit.categories, ...args.categories]),
      ) as Doc<"functionalityUnits">["categories"];
      await ctx.db.patch(args.functionalityUnitId, {
        citations: [...unit.citations, citation],
        memberCount: unit.memberCount + 1,
        categories: mergedCategories,
        lastUpdatedAt: Date.now(),
      });
    }

    if (args.prId)
      await ctx.db.patch(args.prId, { processingStatus: "done" });
    if (args.commitId)
      await ctx.db.patch(args.commitId, { processingStatus: "done" });
  },
});
