"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  classificationSchema,
  CLASSIFICATION_SYSTEM_PROMPT,
  buildClassificationPrompt,
  CLASSIFY_MODEL,
} from "./prompts";
import { getInstallationOctokit, fetchPrDiff, fetchCommitDiff } from "../github/octokit";

const itemValidator = v.object({
  id: v.string(),
  kind: v.union(v.literal("pr"), v.literal("commit")),
  prNumber: v.optional(v.number()),
  sha: v.optional(v.string()),
  title: v.string(),
  body: v.optional(v.string()),
});

function openrouter() {
  return createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}

export const classifyBatch = internalAction({
  args: {
    repositoryId: v.id("repositories"),
    installationId: v.number(),
    owner: v.string(),
    repo: v.string(),
    items: v.array(itemValidator),
  },
  handler: async (ctx, { repositoryId, installationId, owner, repo, items }) => {
    const octokit = await getInstallationOctokit(installationId);
    const model = openrouter()(CLASSIFY_MODEL);

    for (const item of items) {
      try {
        const diff =
          item.kind === "pr" && item.prNumber !== undefined
            ? await fetchPrDiff(octokit, owner, repo, item.prNumber)
            : item.kind === "commit" && item.sha
              ? await fetchCommitDiff(octokit, owner, repo, item.sha)
              : "";

        const { object } = await generateObject({
          model,
          // Tool mode is the only structured-output mode GLM-4.7-flash
          // handles reliably over OpenRouter (json/auto return invalid JSON).
          mode: "tool",
          schema: classificationSchema,
          system: CLASSIFICATION_SYSTEM_PROMPT,
          prompt: buildClassificationPrompt({
            kind: item.kind,
            title: item.title,
            body: item.body,
            diff,
          }),
        });

        await ctx.runMutation(internal.pipeline.orchestrator.markClassified, {
          repositoryId,
          prId: item.kind === "pr" ? (item.id as never) : undefined,
          commitId: item.kind === "commit" ? (item.id as never) : undefined,
          categories: object.categories,
          reasoning: object.reasoning,
          model: CLASSIFY_MODEL,
        });
      } catch (err) {
        console.error("Classification failed", item.id, err);
        await ctx.runMutation(internal.pipeline.orchestrator.markError, {
          prId: item.kind === "pr" ? (item.id as never) : undefined,
          commitId: item.kind === "commit" ? (item.id as never) : undefined,
        });
      }
    }

    // Drain remaining raw items, then move this batch on to grouping.
    await ctx.runMutation(
      internal.pipeline.orchestrator.enqueueClassification,
      { repositoryId },
    );
    await ctx.runMutation(internal.pipeline.orchestrator.enqueueGrouping, {
      repositoryId,
    });
  },
});
