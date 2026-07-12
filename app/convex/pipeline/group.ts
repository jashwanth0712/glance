"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  groupingSchema,
  GROUPING_SYSTEM_PROMPT,
  buildGroupingPrompt,
  GROUP_MODEL,
} from "./prompts";

const groupItemValidator = v.object({
  id: v.string(),
  kind: v.union(v.literal("pr"), v.literal("commit")),
  title: v.string(),
  categories: v.array(v.string()),
  citation: v.any(),
});

function openrouter() {
  return createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}

export const assignToFunctionalityUnit = internalAction({
  args: {
    repositoryId: v.id("repositories"),
    items: v.array(groupItemValidator),
    existingUnits: v.array(
      v.object({ id: v.string(), title: v.string(), summary: v.string() }),
    ),
  },
  handler: async (ctx, { repositoryId, items, existingUnits }) => {
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const existingIds = new Set(existingUnits.map((u) => u.id));

    let assignments: Array<{
      itemId: string;
      existingUnitId?: string;
      newUnitTitle?: string;
      newUnitSummary?: string;
    }> = [];

    try {
      const { object } = await generateObject({
        model: openrouter()(GROUP_MODEL),
        // GLM-4.7-flash only produces valid structured output in tool mode.
        mode: "tool",
        schema: groupingSchema,
        system: GROUPING_SYSTEM_PROMPT,
        prompt: buildGroupingPrompt(
          items.map((i) => ({
            id: i.id,
            title: i.title,
            categories: i.categories,
          })),
          existingUnits,
        ),
      });
      assignments = object.assignments;
    } catch (err) {
      console.error("Grouping failed, falling back to per-item units", err);
    }

    // Fallback: any item the model didn't place becomes its own unit.
    const placed = new Set(assignments.map((a) => a.itemId));
    for (const item of items) {
      if (!placed.has(item.id)) {
        assignments.push({
          itemId: item.id,
          newUnitTitle: item.title.slice(0, 80),
          newUnitSummary: item.title.slice(0, 400),
        });
      }
    }

    // Reuse a newly-created unit when several items share the same title.
    const newUnitCache = new Map<string, Id<"functionalityUnits">>();

    for (const a of assignments) {
      const item = itemMap.get(a.itemId);
      if (!item) continue;

      let unitId: Id<"functionalityUnits"> | undefined;

      if (a.existingUnitId && existingIds.has(a.existingUnitId)) {
        unitId = a.existingUnitId as Id<"functionalityUnits">;
      } else {
        const title = (a.newUnitTitle ?? item.title).slice(0, 80);
        const summary = (a.newUnitSummary ?? item.title).slice(0, 400);
        const cacheKey = title.toLowerCase();
        const cached = newUnitCache.get(cacheKey);
        if (cached) {
          unitId = cached;
        } else {
          const createdId: Id<"functionalityUnits"> = await ctx.runMutation(
            internal.pipeline.orchestrator.createFunctionalityUnit,
            {
              repositoryId,
              title,
              summary,
              categories: item.categories,
              model: GROUP_MODEL,
            },
          );
          newUnitCache.set(cacheKey, createdId);
          unitId = createdId;
        }
      }

      await ctx.runMutation(internal.pipeline.orchestrator.markGrouped, {
        functionalityUnitId: unitId,
        repositoryId,
        prId: item.kind === "pr" ? (item.id as never) : undefined,
        commitId: item.kind === "commit" ? (item.id as never) : undefined,
        categories: item.categories,
      });
    }

    // Drain any remaining classified items.
    await ctx.runMutation(internal.pipeline.orchestrator.enqueueGrouping, {
      repositoryId,
    });
  },
});
