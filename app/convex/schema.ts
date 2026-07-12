import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// The five functionality categories Hermes tags every change with.
export const categoryValidator = v.union(
  v.literal("end_user_features"),
  v.literal("admin_support"),
  v.literal("performance"),
  v.literal("cost_improvement"),
  v.literal("tech_debt"),
);

// Shared processing-state machine for PRs and commits.
export const processingStatusValidator = v.union(
  v.literal("raw"),
  v.literal("classifying"),
  v.literal("classified"),
  v.literal("grouping"),
  v.literal("done"),
  v.literal("error"),
);

const citationValidator = v.object({
  type: v.union(v.literal("pr"), v.literal("commit")),
  prNumber: v.optional(v.number()),
  sha: v.optional(v.string()),
  shortSha: v.optional(v.string()),
  title: v.string(),
  htmlUrl: v.string(),
  authorLogin: v.optional(v.string()),
  authorAvatarUrl: v.optional(v.string()),
  mergedAt: v.optional(v.number()),
});

export default defineSchema({
  ...authTables,

  // ── GitHub App installations (one per org or user account) ──────────────
  githubInstallations: defineTable({
    installationId: v.number(),
    accountLogin: v.string(),
    accountType: v.union(v.literal("Organization"), v.literal("User")),
    accountAvatarUrl: v.string(),
    convexUserId: v.id("users"),
    suspendedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_installation_id", ["installationId"])
    .index("by_user", ["convexUserId"]),

  // ── Repos the user has chosen to track ──────────────────────────────────
  repositories: defineTable({
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
    backfillStatus: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("done"),
    ),
    lastPrNumber: v.optional(v.number()),
    lastCommitCursor: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
    addedAt: v.number(),
  })
    .index("by_installation", ["installationId"])
    .index("by_github_repo_id", ["githubRepoId"])
    .index("by_full_name", ["fullName"])
    .index("by_backfill_status", ["backfillStatus"]),

  // ── Pull requests ────────────────────────────────────────────────────────
  pullRequests: defineTable({
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
    processingStatus: processingStatusValidator,
    classificationAttempts: v.number(),
    createdAtGh: v.number(),
    updatedAtGh: v.number(),
    ingestedAt: v.number(),
  })
    .index("by_repo", ["repositoryId"])
    .index("by_repo_status", ["repositoryId", "processingStatus"])
    .index("by_repo_pr_number", ["repositoryId", "prNumber"]),

  // ── Commits to default branch (may or may not belong to a PR) ────────────
  commits: defineTable({
    repositoryId: v.id("repositories"),
    sha: v.string(),
    shortSha: v.string(),
    message: v.string(),
    fullMessage: v.optional(v.string()),
    authorLogin: v.optional(v.string()),
    authorAvatarUrl: v.optional(v.string()),
    authorEmail: v.string(),
    htmlUrl: v.string(),
    committedAt: v.number(),
    isPrCommit: v.boolean(),
    prId: v.optional(v.id("pullRequests")),
    processingStatus: processingStatusValidator,
    classificationAttempts: v.number(),
    ingestedAt: v.number(),
  })
    .index("by_repo", ["repositoryId"])
    .index("by_repo_status", ["repositoryId", "processingStatus"])
    .index("by_sha", ["repositoryId", "sha"]),

  // ── LLM classification results ──────────────────────────────────────────
  classifications: defineTable({
    prId: v.optional(v.id("pullRequests")),
    commitId: v.optional(v.id("commits")),
    repositoryId: v.id("repositories"),
    categories: v.array(categoryValidator),
    reasoning: v.string(),
    model: v.string(),
    promptVersion: v.number(),
    classifiedAt: v.number(),
  })
    .index("by_pr", ["prId"])
    .index("by_commit", ["commitId"])
    .index("by_repo", ["repositoryId"]),

  // ── Functionality units (LLM-clustered groups) ──────────────────────────
  functionalityUnits: defineTable({
    repositoryId: v.id("repositories"),
    title: v.string(),
    summary: v.string(),
    categories: v.array(categoryValidator),
    citations: v.array(citationValidator),
    memberCount: v.number(),
    lastUpdatedAt: v.number(),
    model: v.string(),
    promptVersion: v.number(),
    createdAt: v.number(),
  })
    .index("by_repo", ["repositoryId"])
    .index("by_repo_updated", ["repositoryId", "lastUpdatedAt"]),

  // ── Junction: which PRs/commits belong to which functionality unit ───────
  functionalityMembers: defineTable({
    functionalityUnitId: v.id("functionalityUnits"),
    repositoryId: v.id("repositories"),
    prId: v.optional(v.id("pullRequests")),
    commitId: v.optional(v.id("commits")),
    assignedAt: v.number(),
  })
    .index("by_unit", ["functionalityUnitId"])
    .index("by_pr", ["prId"])
    .index("by_commit", ["commitId"])
    .index("by_repo", ["repositoryId"]),

  // ── Backfill / catch-up sync jobs ────────────────────────────────────────
  syncJobs: defineTable({
    repositoryId: v.id("repositories"),
    jobType: v.union(
      v.literal("backfill_prs"),
      v.literal("backfill_commits"),
      v.literal("catchup"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("done"),
      v.literal("error"),
    ),
    cursor: v.optional(v.string()),
    page: v.optional(v.number()),
    totalIngested: v.number(),
    errorMessage: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_repo_status", ["repositoryId", "status"])
    .index("by_repo_type", ["repositoryId", "jobType"]),

  // ── Webhook event log (dedupe + debugging) ───────────────────────────────
  webhookEvents: defineTable({
    deliveryId: v.string(),
    event: v.string(),
    action: v.optional(v.string()),
    installationId: v.optional(v.number()),
    repoFullName: v.optional(v.string()),
    processed: v.boolean(),
    receivedAt: v.number(),
  })
    .index("by_delivery", ["deliveryId"])
    .index("by_processed", ["processed"]),
});
