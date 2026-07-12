import { z } from "zod";

// Bump when the classification prompt/schema changes. Existing rows keep
// their old version and are NOT auto-reprocessed.
export const CLASSIFICATION_PROMPT_VERSION = 1;
export const GROUPING_PROMPT_VERSION = 1;

// Model routed through OpenRouter (OpenAI-compatible endpoint).
export const CLASSIFY_MODEL = "z-ai/glm-4.7-flash";
export const GROUP_MODEL = "z-ai/glm-4.7-flash";

export const CATEGORY_VALUES = [
  "end_user_features",
  "admin_support",
  "performance",
  "cost_improvement",
  "tech_debt",
] as const;

export const CATEGORY_LABELS: Record<(typeof CATEGORY_VALUES)[number], string> = {
  end_user_features: "End User Features",
  admin_support: "Admin & Support",
  performance: "Performance",
  cost_improvement: "Cost Improvement",
  tech_debt: "Tech Debt",
};

export const classificationSchema = z.object({
  categories: z
    .array(z.enum(CATEGORY_VALUES))
    .min(1)
    .describe("One or more categories that apply to this change."),
  reasoning: z
    .string()
    .max(240)
    .describe("One or two sentences justifying the categories."),
});

export const CLASSIFICATION_SYSTEM_PROMPT = `You are a technical analyst classifying software changes for an engineering manager.
Given a pull request or commit (title, description, and a diff snippet), assign one or more categories.

Categories (use the exact enum values):
- end_user_features: user-visible product features, UI, or workflows users directly experience
- admin_support: internal tooling, config panels, admin dashboards, support/ops workflows, permissions
- performance: speed, latency, or throughput improvements
- cost_improvement: reductions in compute/token/infra/API spend
- tech_debt: refactors, dependency upgrades, test coverage, docs, cleanup

Rules:
- Assign multiple categories only when genuinely applicable.
- Base the decision on the diff when present; otherwise use title and description.
- Keep reasoning to one or two sentences.`;

export function buildClassificationPrompt(item: {
  kind: "pr" | "commit";
  title: string;
  body?: string;
  diff?: string;
}): string {
  const parts = [
    `Type: ${item.kind === "pr" ? "Pull Request" : "Commit"}`,
    `Title: ${item.title}`,
  ];
  if (item.body) parts.push(`Description:\n${item.body.slice(0, 2000)}`);
  if (item.diff) parts.push(`Diff (truncated):\n${item.diff}`);
  return parts.join("\n\n");
}

// ── Grouping ──────────────────────────────────────────────────────────────

export const groupingSchema = z.object({
  assignments: z.array(
    z.object({
      itemId: z.string().describe("The id of the item being assigned."),
      existingUnitId: z
        .string()
        .optional()
        .describe("Id of an existing functionality unit to attach this to."),
      newUnitTitle: z
        .string()
        .max(80)
        .optional()
        .describe("Title for a new functionality unit (if not existing)."),
      newUnitSummary: z
        .string()
        .max(400)
        .optional()
        .describe("2-3 sentence summary for the new functionality unit."),
    }),
  ),
});

export const GROUPING_SYSTEM_PROMPT = `You cluster software changes into "functionality units" — coherent features or bodies of work.
Multiple PRs/commits can belong to one functionality unit.

You are given:
1. A list of NEW items to place (each with an id, title, and categories).
2. A list of EXISTING functionality units (each with an id, title, summary).

For each new item, either:
- attach it to an existing unit (set existingUnitId), when it clearly continues the same functional area, OR
- create a new unit (set newUnitTitle + newUnitSummary).

Guidance:
- Prefer creating a new unit when uncertain — do not force unrelated work together.
- Multiple new items in this batch may share the same new unit; give them the same newUnitTitle.
- Titles should read like a feature name ("OAuth login flow", "Billing webhooks"), not a PR title.`;

export function buildGroupingPrompt(
  items: Array<{ id: string; title: string; categories: string[] }>,
  existingUnits: Array<{ id: string; title: string; summary: string }>,
): string {
  const existing =
    existingUnits.length > 0
      ? existingUnits
          .map((u) => `- id=${u.id} | ${u.title}: ${u.summary}`)
          .join("\n")
      : "(none yet)";
  const newItems = items
    .map(
      (i) => `- id=${i.id} | [${i.categories.join(", ")}] ${i.title}`,
    )
    .join("\n");
  return `EXISTING FUNCTIONALITY UNITS:\n${existing}\n\nNEW ITEMS TO PLACE:\n${newItems}`;
}
