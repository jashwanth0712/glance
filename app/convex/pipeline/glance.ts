"use node";

import { createHash } from "crypto";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  glanceNarrativeSchema,
  GLANCE_SYSTEM_PROMPT,
  buildGlancePrompt,
  GLANCE_MODEL,
} from "./prompts";

const WINDOW_LABEL: Record<string, string> = {
  "3d": "3 days",
  "1w": "week",
  "1m": "month",
  "3m": "3 months",
};

function openrouter() {
  return createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}

// Deterministic hash of the classified content in scope. Adding an
// unclassified PR does not change this, so the cache stays warm until the
// underlying classified picture actually changes.
function hashPayload(data: {
  categoryCounts: Record<string, number>;
  contributors: Array<{ login: string; counts: Record<string, number>; total: number }>;
  topUnits: Array<{ title: string }>;
  classifiedCount: number;
}): string {
  const canonical = JSON.stringify({
    categoryCounts: Object.entries(data.categoryCounts).sort(),
    contributors: data.contributors
      .map((c) => ({
        login: c.login,
        total: c.total,
        counts: Object.entries(c.counts).sort(),
      }))
      .sort((a, b) => a.login.localeCompare(b.login)),
    topUnits: data.topUnits.map((u) => u.title).sort(),
    classifiedCount: data.classifiedCount,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Generate (or return a cached) executive summary for a repo + time window.
 * Re-runs getGlanceData server-side so the summary reflects authoritative,
 * auth-gated data rather than anything supplied by the client.
 */
export const generateGlanceNarrative = action({
  args: {
    repositoryId: v.id("repositories"),
    windowKey: v.union(
      v.literal("3d"),
      v.literal("1w"),
      v.literal("1m"),
      v.literal("3m"),
    ),
    forceRegenerate: v.optional(v.boolean()),
  },
  returns: v.string(),
  handler: async (ctx, { repositoryId, windowKey, forceRegenerate }): Promise<string> => {
    const data = await ctx.runQuery(api.queries.glance.getGlanceData, {
      repositoryId,
      windowKey,
    });
    if (!data) throw new Error("Repository not found or access denied.");

    if (data.classifiedCount === 0) {
      return "No classified activity in this window yet — nothing to summarize.";
    }

    const repo = await ctx.runQuery(api.github.repositories.getRepo, {
      repositoryId,
    });
    const repoFullName = repo?.fullName ?? "this repository";

    const contentHash = hashPayload(data);

    if (!forceRegenerate) {
      const cached = await ctx.runQuery(
        internal.pipeline.glanceCache.getCachedSummary,
        { repositoryId, windowKey, contentHash },
      );
      if (cached) return cached;
    }

    const model = openrouter()(GLANCE_MODEL);
    const { object } = await generateObject({
      model,
      // Tool mode is the only structured-output mode GLM-4.7-flash handles
      // reliably over OpenRouter (see classify.ts).
      mode: "tool",
      schema: glanceNarrativeSchema,
      system: GLANCE_SYSTEM_PROMPT,
      prompt: buildGlancePrompt({
        repoFullName,
        windowLabel: WINDOW_LABEL[windowKey],
        categoryCounts: data.categoryCounts,
        topUnits: data.topUnits,
        contributors: data.contributors,
        classifiedCount: data.classifiedCount,
        pendingCount: data.pendingCount,
        alignmentScore: data.alignmentScore,
        alignmentLabel: data.alignmentLabel,
      }),
    });

    await ctx.runMutation(internal.pipeline.glanceCache.saveGlanceSummary, {
      repositoryId,
      windowKey,
      contentHash,
      narrative: object.narrative,
      model: GLANCE_MODEL,
      classifiedCount: data.classifiedCount,
    });

    return object.narrative;
  },
});
