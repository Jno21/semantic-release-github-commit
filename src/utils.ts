import { RepoInfo, SemanticReleaseContext } from "./types";
import { createError } from "./errors";

/**
 * Get GitHub authentication token from environment or config
 */
export function getAuthToken(
  env: Record<string, string | undefined>,
  githubToken?: string,
): string {
  const token = env.GH_TOKEN || env.GITHUB_TOKEN || githubToken;

  if (!token) {
    throw createError(
      "EGHNOAUTH",
      "No GitHub authentication token found. Please provide GH_TOKEN, GITHUB_TOKEN environment variable, or githubToken in plugin config.",
    );
  }

  return token;
}

/**
 * Parse repository URL to extract owner and repo
 */
export function parseRepositoryUrl(url: string): {
  owner: string;
  repo: string;
} {
  // Handle various GitHub URL formats:
  // - https://github.com/owner/repo.git
  // - git@github.com:owner/repo.git
  // - https://github.com/owner/repo
  // - owner/repo

  let match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);

  if (!match) {
    // Try simple owner/repo format
    match = url.match(/^([^/]+)\/([^/]+)$/);
  }

  if (!match) {
    throw createError("ENOREPO", `Unable to parse repository URL: ${url}`);
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");

  return { owner, repo };
}

/**
 * Get repository information from semantic-release context
 */
export function getRepoInfo(context: SemanticReleaseContext): RepoInfo {
  const { env, options } = context;

  // Get repository URL from options
  const repositoryUrl = (options as any).repositoryUrl;
  if (!repositoryUrl) {
    throw createError(
      "ENOREPO",
      "No repository URL found in semantic-release config",
    );
  }

  const { owner, repo } = parseRepositoryUrl(repositoryUrl);

  // Detect branch from environment or branch config
  let branch =
    env.GITHUB_REF?.replace("refs/heads/", "") ||
    env.GIT_BRANCH?.replace("origin/", "") ||
    env.BRANCH_NAME;

  // Fallback to branch from options
  if (!branch) {
    const branches = (options as any).branches;
    if (Array.isArray(branches) && branches.length > 0) {
      branch = typeof branches[0] === "string" ? branches[0] : branches[0].name;
    }
  }

  if (!branch) {
    throw createError(
      "ENOBRANCH",
      "Unable to detect branch name from CI environment or semantic-release config",
    );
  }

  return { owner, repo, branch };
}

/**
 * Get git author/committer info from environment or config
 * Note: Ignores semantic-release default bot identity to enable GitHub App auto-signing
 */
export function getGitIdentity(
  env: Record<string, string | undefined>,
  type: "author" | "committer",
  configName?: string,
  configEmail?: string,
): { name: string; email: string } | undefined {
  const name = configName || env[`GIT_${type.toUpperCase()}_NAME`];
  const email = configEmail || env[`GIT_${type.toUpperCase()}_EMAIL`];

  // Ignore semantic-release default bot identity to enable GitHub App auto-signing
  // This allows commits to be verified with the GitHub App's identity
  if (
    name === "semantic-release-bot" &&
    email === "semantic-release-bot@martynus.net"
  ) {
    return undefined;
  }

  if (name && email) {
    return { name, email };
  }

  return undefined;
}
