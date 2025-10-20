export interface PluginConfig {
  /**
   * List of file paths/globs relative to repo root
   */
  files: string[];

  /**
   * GitHub authentication token (fallback if env vars not set)
   */
  githubToken?: string;

  /**
   * Commit message template
   * Can use template variables like ${nextRelease.version}
   * @default "chore(release): ${nextRelease.version} [skip ci]"
   */
  commitMessage?: string;

  /**
   * Git author name (optional override)
   */
  authorName?: string;

  /**
   * Git author email (optional override)
   */
  authorEmail?: string;

  /**
   * Git committer name (optional override)
   */
  committerName?: string;

  /**
   * Git committer email (optional override)
   */
  committerEmail?: string;

  /**
   * Dry run mode - log operations without executing them
   * @default false
   */
  dryRun?: boolean;
}

export interface SemanticReleaseContext {
  logger: {
    log: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    success: (message: string, ...args: any[]) => void;
  };
  env: Record<string, string | undefined>;
  cwd?: string;
  options: {
    repositoryUrl?: string;
    branches?: Array<string | { name: string }>;
    [key: string]: any;
  };
  nextRelease?: {
    version: string;
    gitTag: string;
    gitHead: string;
    notes: string;
  };
}

export interface RepoInfo {
  owner: string;
  repo: string;
  branch: string;
}

export interface FileBlob {
  path: string;
  content: string;
  encoding: "utf-8" | "base64";
  sha?: string;
}

export interface GitHubRef {
  ref: string;
  object: {
    sha: string;
    type: string;
  };
}

export interface GitHubBlob {
  sha: string;
  url: string;
}

export interface GitHubTree {
  sha: string;
  url?: string;
  tree: Array<{
    path: string;
    mode: string;
    type: string;
    sha: string;
  }>;
}

export interface GitHubCommit {
  sha: string;
  url?: string;
  message: string;
  tree: {
    sha: string;
  };
  parents: Array<{
    sha: string;
  }>;
}
