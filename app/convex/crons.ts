import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Safety net: every 5 minutes, catch up on any GitHub activity that webhooks
// missed and re-drive the classification/grouping pipeline for each repo.
crons.interval(
  "github catch-up",
  { minutes: 5 },
  internal.github.ingest.catchUpAllRepos,
  {},
);

export default crons;
