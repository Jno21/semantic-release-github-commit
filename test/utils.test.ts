import {
  getAuthToken,
  parseRepositoryUrl,
  getRepoInfo,
  getGitIdentity,
} from "../src/utils";
import { SemanticReleaseContext } from "../src/types";

describe("getAuthToken", () => {
  it("should prefer GH_TOKEN over GITHUB_TOKEN", () => {
    const env = {
      GH_TOKEN: "gh-token",
      GITHUB_TOKEN: "github-token",
    };
    expect(getAuthToken(env)).toBe("gh-token");
  });

  it("should use GITHUB_TOKEN if GH_TOKEN is not available", () => {
    const env = {
      GITHUB_TOKEN: "github-token",
    };
    expect(getAuthToken(env)).toBe("github-token");
  });

  it("should use githubToken from config if env vars are not available", () => {
    const env = {};
    expect(getAuthToken(env, "config-token")).toBe("config-token");
  });

  it("should throw error when no token is available", () => {
    const env = {};
    expect(() => getAuthToken(env)).toThrow(
      "No GitHub authentication token found",
    );
  });
});

describe("parseRepositoryUrl", () => {
  it("should parse HTTPS GitHub URL", () => {
    const result = parseRepositoryUrl("https://github.com/owner/repo.git");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  it("should parse HTTPS GitHub URL without .git", () => {
    const result = parseRepositoryUrl("https://github.com/owner/repo");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  it("should parse SSH GitHub URL", () => {
    const result = parseRepositoryUrl("git@github.com:owner/repo.git");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  it("should parse simple owner/repo format", () => {
    const result = parseRepositoryUrl("owner/repo");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  it("should throw error for invalid URL", () => {
    expect(() => parseRepositoryUrl("invalid-url")).toThrow(
      "Unable to parse repository URL",
    );
  });
});

describe("getRepoInfo", () => {
  it("should extract repo info from context", () => {
    const context: SemanticReleaseContext = {
      env: {
        GITHUB_REF: "refs/heads/main",
      },
      options: {
        repositoryUrl: "https://github.com/owner/repo.git",
      },
    } as any;

    const result = getRepoInfo(context);
    expect(result).toEqual({
      owner: "owner",
      repo: "repo",
      branch: "main",
    });
  });

  it("should detect branch from GIT_BRANCH env var", () => {
    const context: SemanticReleaseContext = {
      env: {
        GIT_BRANCH: "origin/develop",
      },
      options: {
        repositoryUrl: "https://github.com/owner/repo.git",
      },
    } as any;

    const result = getRepoInfo(context);
    expect(result.branch).toBe("develop");
  });

  it("should detect branch from BRANCH_NAME env var", () => {
    const context: SemanticReleaseContext = {
      env: {
        BRANCH_NAME: "feature-branch",
      },
      options: {
        repositoryUrl: "https://github.com/owner/repo.git",
      },
    } as any;

    const result = getRepoInfo(context);
    expect(result.branch).toBe("feature-branch");
  });

  it("should fallback to branches config", () => {
    const context: SemanticReleaseContext = {
      env: {},
      options: {
        repositoryUrl: "https://github.com/owner/repo.git",
        branches: ["main"],
      },
    } as any;

    const result = getRepoInfo(context);
    expect(result.branch).toBe("main");
  });

  it("should handle branch object in config", () => {
    const context: SemanticReleaseContext = {
      env: {},
      options: {
        repositoryUrl: "https://github.com/owner/repo.git",
        branches: [{ name: "main" }],
      },
    } as any;

    const result = getRepoInfo(context);
    expect(result.branch).toBe("main");
  });

  it("should throw error when repositoryUrl is missing", () => {
    const context: SemanticReleaseContext = {
      env: {},
      options: {},
    } as any;

    expect(() => getRepoInfo(context)).toThrow("No repository URL found");
  });

  it("should throw error when branch cannot be detected", () => {
    const context: SemanticReleaseContext = {
      env: {},
      options: {
        repositoryUrl: "https://github.com/owner/repo.git",
      },
    } as any;

    expect(() => getRepoInfo(context)).toThrow("Unable to detect branch name");
  });
});

describe("getGitIdentity", () => {
  it("should return identity from config", () => {
    const env = {};
    const result = getGitIdentity(
      env,
      "author",
      "John Doe",
      "john@example.com",
    );
    expect(result).toEqual({ name: "John Doe", email: "john@example.com" });
  });

  it("should return identity from env vars", () => {
    const env = {
      GIT_AUTHOR_NAME: "Jane Doe",
      GIT_AUTHOR_EMAIL: "jane@example.com",
    };
    const result = getGitIdentity(env, "author");
    expect(result).toEqual({ name: "Jane Doe", email: "jane@example.com" });
  });

  it("should prefer config over env vars", () => {
    const env = {
      GIT_AUTHOR_NAME: "Jane Doe",
      GIT_AUTHOR_EMAIL: "jane@example.com",
    };
    const result = getGitIdentity(
      env,
      "author",
      "John Doe",
      "john@example.com",
    );
    expect(result).toEqual({ name: "John Doe", email: "john@example.com" });
  });

  it("should return undefined when identity is incomplete", () => {
    const env = {
      GIT_AUTHOR_NAME: "John Doe",
    };
    const result = getGitIdentity(env, "author");
    expect(result).toBeUndefined();
  });

  it("should handle committer identity", () => {
    const env = {
      GIT_COMMITTER_NAME: "Jane Doe",
      GIT_COMMITTER_EMAIL: "jane@example.com",
    };
    const result = getGitIdentity(env, "committer");
    expect(result).toEqual({ name: "Jane Doe", email: "jane@example.com" });
  });

  it("should ignore semantic-release-bot default identity", () => {
    const env = {
      GIT_AUTHOR_NAME: "semantic-release-bot",
      GIT_AUTHOR_EMAIL: "semantic-release-bot@martynus.net",
    };
    const result = getGitIdentity(env, "author");
    expect(result).toBeUndefined();
  });

  it("should ignore semantic-release-bot for committer too", () => {
    const env = {
      GIT_COMMITTER_NAME: "semantic-release-bot",
      GIT_COMMITTER_EMAIL: "semantic-release-bot@martynus.net",
    };
    const result = getGitIdentity(env, "committer");
    expect(result).toBeUndefined();
  });

  it("should not ignore semantic-release-bot if email is different", () => {
    const env = {
      GIT_AUTHOR_NAME: "semantic-release-bot",
      GIT_AUTHOR_EMAIL: "different@email.com",
    };
    const result = getGitIdentity(env, "author");
    expect(result).toEqual({
      name: "semantic-release-bot",
      email: "different@email.com",
    });
  });
});
