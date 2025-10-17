import { Octokit } from "@octokit/rest";
import {
  GitHubBlob,
  GitHubCommit,
  GitHubRef,
  GitHubTree,
  RepoInfo,
} from "./types";
import { createError } from "./errors";

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Get the current ref (branch HEAD) for a repository
   */
  async getRef(repo: RepoInfo): Promise<GitHubRef> {
    try {
      const { data } = await this.octokit.rest.git.getRef({
        owner: repo.owner,
        repo: repo.repo,
        ref: `heads/${repo.branch}`,
      });

      return {
        ref: data.ref,
        object: {
          sha: data.object.sha,
          type: data.object.type,
        },
      };
    } catch (error: any) {
      throw createError(
        "EGHAPI",
        `Failed to get ref for branch ${repo.branch}`,
        error.message,
      );
    }
  }

  /**
   * Create a blob for a file
   */
  async createBlob(
    repo: RepoInfo,
    content: string,
    encoding: "utf-8" | "base64",
  ): Promise<GitHubBlob> {
    try {
      const { data } = await this.octokit.rest.git.createBlob({
        owner: repo.owner,
        repo: repo.repo,
        content,
        encoding,
      });

      return {
        sha: data.sha,
        url: data.url,
      };
    } catch (error: any) {
      throw createError("EGHAPI", "Failed to create blob", error.message);
    }
  }

  /**
   * Create a tree with updated files
   */
  async createTree(
    repo: RepoInfo,
    baseTreeSha: string,
    files: Array<{ path: string; sha: string }>,
  ): Promise<GitHubTree> {
    try {
      const { data } = await this.octokit.rest.git.createTree({
        owner: repo.owner,
        repo: repo.repo,
        base_tree: baseTreeSha,
        tree: files.map((file) => ({
          path: file.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: file.sha,
        })),
      });

      return {
        sha: data.sha,
        url: data.url,
        tree: data.tree.map((item) => ({
          path: item.path || "",
          mode: item.mode || "",
          type: item.type || "",
          sha: item.sha || "",
        })),
      };
    } catch (error: any) {
      throw createError("EGHAPI", "Failed to create tree", error.message);
    }
  }

  /**
   * Get a commit object
   */
  async getCommit(repo: RepoInfo, sha: string): Promise<GitHubCommit> {
    try {
      const { data } = await this.octokit.rest.git.getCommit({
        owner: repo.owner,
        repo: repo.repo,
        commit_sha: sha,
      });

      return {
        sha: data.sha,
        url: data.url,
        message: data.message,
        tree: {
          sha: data.tree.sha,
        },
        parents: data.parents.map((p) => ({ sha: p.sha })),
      };
    } catch (error: any) {
      throw createError("EGHAPI", `Failed to get commit ${sha}`, error.message);
    }
  }

  /**
   * Create a commit
   * Note: For GitHub App tokens to enable automatic bot signature verification,
   * do not pass author/committer parameters. GitHub will automatically set them
   * based on the authenticated app/bot.
   */
  async createCommit(
    repo: RepoInfo,
    message: string,
    treeSha: string,
    parentShas: string[],
    author?: { name: string; email: string },
    committer?: { name: string; email: string },
  ): Promise<GitHubCommit> {
    try {
      // Build the request parameters
      const params: any = {
        owner: repo.owner,
        repo: repo.repo,
        message,
        tree: treeSha,
        parents: parentShas,
      };

      // Only include author/committer if explicitly provided
      // Omitting them allows GitHub Apps to automatically sign commits
      if (author) {
        params.author = author;
      }
      if (committer) {
        params.committer = committer;
      }

      const { data } = await this.octokit.rest.git.createCommit(params);

      return {
        sha: data.sha,
        url: data.url,
        message: data.message,
        tree: {
          sha: data.tree.sha,
        },
        parents: data.parents.map((p) => ({ sha: p.sha })),
      };
    } catch (error: any) {
      throw createError("EGHAPI", "Failed to create commit", error.message);
    }
  }

  /**
   * Update a ref to point to a new commit (fast-forward)
   */
  async updateRef(repo: RepoInfo, sha: string): Promise<void> {
    try {
      await this.octokit.rest.git.updateRef({
        owner: repo.owner,
        repo: repo.repo,
        ref: `heads/${repo.branch}`,
        sha,
        force: false,
      });
    } catch (error: any) {
      throw createError(
        "EGHAPI",
        `Failed to update ref heads/${repo.branch} to ${sha}`,
        error.message,
      );
    }
  }
}
