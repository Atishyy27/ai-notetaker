import type { NewActionItem } from "./db";
import type { SummaryTopic } from "./types";

// A realistic, pre-baked session so the dashboard, history and action-item
// editing can be explored with zero API keys. This is clearly-labelled SAMPLE
// data: it is seeded straight into the store and never claims the live AI ran.
// The real transcribe/analyze path is untouched and still needs real keys.

export const SAMPLE_TITLE = "Sample - model launch sync";
export const SAMPLE_DURATION_SEC = 372;

export const SAMPLE_TRANSCRIPT = `Dario: Thanks everyone. Quick one - where are we on the launch?
Sam: API side is done, the new endpoint shipped Monday. Eval is still running.
Dario: Good. Any blockers?
Dev: The onboarding emails aren't wired up yet. I need final copy before I can build the templates.
Dario: Okay. Sundar owns the copy - I'll ping to get it over by Thursday.
Sam: One risk: the migration has to run before launch and it locks the accounts table for a few minutes. We should do it off-peak.
Dario: Agreed, schedule it for Saturday 6am. Sam, can you own that?
Sam: Yep, I'll run the migration Saturday morning and post in the channel when it's clean.
Dev: Once I have the copy I can have the onboarding emails done in two days.
Dario: Great. Let's also make sure we have a rollback plan written down - that's non-negotiable before we ship.
Sam: I'll add the rollback steps to the runbook.
Dario: Perfect. We launch Tuesday if eval signs off. Thanks all.`;

export const SAMPLE_SUMMARY: SummaryTopic[] = [
  {
    topic: "Launch readiness",
    points: [
      "API is complete; the new endpoint shipped Monday.",
      "Eval is still running and is the gate for a Tuesday launch.",
    ],
  },
  {
    topic: "Onboarding emails",
    points: [
      "Email templates are blocked on final copy (owned by Sundar).",
      "Build takes two days once the copy is received.",
    ],
  },
  {
    topic: "Database migration and safety",
    points: [
      "The migration locks the accounts table for a few minutes, so it runs off-peak on Saturday 6am.",
      "A written rollback plan was called non-negotiable before shipping.",
    ],
  },
];

export const SAMPLE_ACTION_ITEMS: NewActionItem[] = [
  {
    task: "Get final onboarding email copy over to Dev",
    assignee: "Dario",
    dueDate: "by Thursday",
    priority: "High",
  },
  {
    task: "Run the database migration off-peak and confirm in the channel",
    assignee: "Sam",
    dueDate: "Saturday 6am",
    priority: "High",
  },
  {
    task: "Build the onboarding email templates once copy is in",
    assignee: "Dev",
    dueDate: null,
    priority: "Medium",
  },
  {
    task: "Add rollback steps to the runbook",
    assignee: "Sam",
    dueDate: null,
    priority: "High",
  },
  {
    task: "Sign off eval so launch can proceed Tuesday",
    assignee: "Unassigned",
    dueDate: null,
    priority: "Medium",
  },
];
