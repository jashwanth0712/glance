/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as github_ingest from "../github/ingest.js";
import type * as github_installations from "../github/installations.js";
import type * as github_octokit from "../github/octokit.js";
import type * as github_repositories from "../github/repositories.js";
import type * as github_webhookHandler from "../github/webhookHandler.js";
import type * as http from "../http.js";
import type * as pipeline_classify from "../pipeline/classify.js";
import type * as pipeline_glance from "../pipeline/glance.js";
import type * as pipeline_glanceCache from "../pipeline/glanceCache.js";
import type * as pipeline_group from "../pipeline/group.js";
import type * as pipeline_orchestrator from "../pipeline/orchestrator.js";
import type * as pipeline_prompts from "../pipeline/prompts.js";
import type * as queries_dashboard from "../queries/dashboard.js";
import type * as queries_glance from "../queries/glance.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  "github/ingest": typeof github_ingest;
  "github/installations": typeof github_installations;
  "github/octokit": typeof github_octokit;
  "github/repositories": typeof github_repositories;
  "github/webhookHandler": typeof github_webhookHandler;
  http: typeof http;
  "pipeline/classify": typeof pipeline_classify;
  "pipeline/glance": typeof pipeline_glance;
  "pipeline/glanceCache": typeof pipeline_glanceCache;
  "pipeline/group": typeof pipeline_group;
  "pipeline/orchestrator": typeof pipeline_orchestrator;
  "pipeline/prompts": typeof pipeline_prompts;
  "queries/dashboard": typeof queries_dashboard;
  "queries/glance": typeof queries_glance;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
