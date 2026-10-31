import { z } from "zod";

/**
 * The single source of truth for the LLM's structured output.
 *
 * This schema is handed to the AI SDK's `generateObject`, so the model is
 * constrained to emit exactly this shape. There is no `JSON.parse` of a free
 * text reply anywhere in the app, which is what kills "hallucinated format"
 * and truncation. The `.describe()` lines are sent to the model as field
 * intent, which is where the determinism comes from.
 */

export const PRIORITIES = ["High", "Medium", "Low"] as const;
export const priorityEnum = z.enum(PRIORITIES);
export type Priority = (typeof PRIORITIES)[number];

export const actionItemSchema = z.object({
  task: z
    .string()
    .min(1)
    .describe("The concrete action to be done, phrased as a short imperative."),
  assignee: z
    .string()
    .describe(
      'The person responsible, inferred from the conversation. Use exactly "Unassigned" when no owner is stated or implied.',
    ),
  dueDate: z
    .string()
    .nullable()
    .describe(
      "The due date or timeframe only if explicitly mentioned, copied as spoken (e.g. 'by Friday', 'next sprint'). null when none is given. Never guess a date.",
    ),
  priority: priorityEnum.describe(
    "Urgency inferred from the language and stated consequences. Default to 'Medium' when there is no strong signal.",
  ),
});
export type ActionItem = z.infer<typeof actionItemSchema>;

export const summaryTopicSchema = z.object({
  topic: z.string().describe("A short title for this discussion topic."),
  points: z
    .array(z.string())
    .describe("Two to five concise, factual bullet points under this topic."),
});
export type SummaryTopic = z.infer<typeof summaryTopicSchema>;

export const analysisSchema = z.object({
  summary: z
    .array(summaryTopicSchema)
    .describe("The executive summary, organised by key discussion topic."),
  actionItems: z
    .array(actionItemSchema)
    .describe(
      "Discrete, de-duplicated action items. An action item is a commitment or task someone agreed to do, not general discussion.",
    ),
});
export type Analysis = z.infer<typeof analysisSchema>;
