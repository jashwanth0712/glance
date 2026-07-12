"use node";

import { App } from "@octokit/app";
import type { Octokit } from "@octokit/core";

let cachedApp: App | null = null;

function getApp(): App {
  if (cachedApp) return cachedApp;
  const appId = process.env.GITHUB_APP_ID;
  const rawKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !rawKey) {
    throw new Error(
      "GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set in the Convex environment.",
    );
  }
  // Env vars often store the PEM with literal "\n" sequences — normalize them.
  const privateKey = rawKey.includes("\\n")
    ? rawKey.replace(/\\n/g, "\n")
    : rawKey;
  cachedApp = new App({ appId, privateKey });
  return cachedApp;
}

/** Returns an Octokit client authenticated as the given installation. */
export async function getInstallationOctokit(
  installationId: number,
): Promise<Octokit> {
  return await getApp().getInstallationOctokit(installationId);
}

/** Looks up the org/user account that owns an installation (app-level auth). */
export async function getInstallationAccount(installationId: number): Promise<{
  login: string;
  type: "Organization" | "User";
  avatarUrl: string;
}> {
  const { data } = await getApp().octokit.request(
    "GET /app/installations/{installation_id}",
    { installation_id: installationId },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const account = data.account as any;
  return {
    login: account?.login ?? account?.slug ?? "unknown",
    type: account?.type === "Organization" ? "Organization" : "User",
    avatarUrl: account?.avatar_url ?? "",
  };
}

/** Lists repositories accessible to an installation (paginated internally). */
export async function listInstallationRepos(installationId: number) {
  const octokit = await getInstallationOctokit(installationId);
  const repos: Array<{
    githubRepoId: number;
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    private: boolean;
  }> = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await octokit.request("GET /installation/repositories", {
      per_page: 100,
      page,
    });
    for (const repo of data.repositories) {
      repos.push({
        githubRepoId: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        defaultBranch: repo.default_branch,
        private: repo.private,
      });
    }
    if (data.repositories.length < 100) break;
    page += 1;
  }
  return repos;
}

/** Fetches the unified diff for a PR, truncated to `maxChars`. */
export async function fetchPrDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  maxChars = 12000,
): Promise<string> {
  try {
    const res = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}",
      {
        owner,
        repo,
        pull_number: prNumber,
        mediaType: { format: "diff" },
      },
    );
    // With the diff media type the body is the raw diff string.
    const diff = res.data as unknown as string;
    return typeof diff === "string" ? diff.slice(0, maxChars) : "";
  } catch {
    return "";
  }
}

/** Fetches the diff for a single commit, truncated to `maxChars`. */
export async function fetchCommitDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  sha: string,
  maxChars = 12000,
): Promise<string> {
  try {
    const res = await octokit.request(
      "GET /repos/{owner}/{repo}/commits/{ref}",
      {
        owner,
        repo,
        ref: sha,
        mediaType: { format: "diff" },
      },
    );
    const diff = res.data as unknown as string;
    return typeof diff === "string" ? diff.slice(0, maxChars) : "";
  } catch {
    return "";
  }
}
