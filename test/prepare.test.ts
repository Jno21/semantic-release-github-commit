import { prepare } from "../src/prepare";
import { PluginConfig, SemanticReleaseContext } from "../src/types";
import { GitHubClient } from "../src/github";
import { resolveFiles, readFilesAsBlobs } from "../src/files";

// Mock dependencies
jest.mock("../src/github");
jest.mock("../src/files");

const mockResolveFiles = resolveFiles as jest.MockedFunction<
  typeof resolveFiles
>;
const mockReadFilesAsBlobs = readFilesAsBlobs as jest.MockedFunction<
  typeof readFilesAsBlobs
>;

const createMockContext = (
  overrides?: Partial<SemanticReleaseContext>,
): SemanticReleaseContext =>
  ({
    env: {
      GITHUB_TOKEN: "test-token",
    },
    cwd: "/test/repo",
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
    },
    options: {
      repositoryUrl: "https://github.com/owner/repo.git",
      branches: ["main"],
    },
    ...overrides,
  }) as any;

describe("prepare", () => {
  let mockGitHubClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock GitHub client
    mockGitHubClient = {
      getRef: jest.fn().mockResolvedValue({
        ref: "refs/heads/main",
        object: { sha: "abc123", type: "commit" },
      }),
      getCommit: jest.fn().mockResolvedValue({
        sha: "abc123",
        tree: { sha: "tree123" },
        parents: [{ sha: "parent123" }],
      }),
      createBlob: jest.fn().mockResolvedValue({
        sha: "blob123",
        url: "https://api.github.com/repos/owner/repo/git/blobs/blob123",
      }),
      createTree: jest.fn().mockResolvedValue({
        sha: "newtree456",
        url: "https://api.github.com/repos/owner/repo/git/trees/newtree456",
        tree: [],
      }),
      createCommit: jest.fn().mockResolvedValue({
        sha: "commit456",
        url: "https://api.github.com/repos/owner/repo/git/commits/commit456",
        message: "test commit",
        tree: { sha: "newtree456" },
        parents: [{ sha: "abc123" }],
      }),
      updateRef: jest.fn().mockResolvedValue(undefined),
    };

    (GitHubClient as jest.MockedClass<typeof GitHubClient>).mockImplementation(
      () => mockGitHubClient,
    );
  });

  it("should commit files successfully", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**", "CHANGELOG.md"],
    };
    const context = createMockContext();

    mockResolveFiles.mockResolvedValue(["dist/index.js", "CHANGELOG.md"]);
    mockReadFilesAsBlobs.mockResolvedValue([
      {
        path: "dist/index.js",
        content: 'console.log("hello")',
        encoding: "utf-8",
      },
      { path: "CHANGELOG.md", content: "# Changelog", encoding: "utf-8" },
    ]);

    await prepare(pluginConfig, context);

    expect(mockResolveFiles).toHaveBeenCalledWith(
      ["dist/**", "CHANGELOG.md"],
      "/test/repo",
    );
    expect(mockReadFilesAsBlobs).toHaveBeenCalledWith(
      ["dist/index.js", "CHANGELOG.md"],
      "/test/repo",
    );
    expect(mockGitHubClient.getRef).toHaveBeenCalled();
    expect(mockGitHubClient.createBlob).toHaveBeenCalledTimes(2);
    expect(mockGitHubClient.createTree).toHaveBeenCalled();
    expect(mockGitHubClient.createCommit).toHaveBeenCalled();
    expect(mockGitHubClient.updateRef).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "owner", repo: "repo", branch: "main" }),
      "commit456",
    );
  });

  it("should skip commit when no files match patterns", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
    };
    const context = createMockContext();

    mockResolveFiles.mockResolvedValue([]);

    await prepare(pluginConfig, context);

    expect(context.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("No files matched"),
    );
    expect(mockGitHubClient.createBlob).not.toHaveBeenCalled();
    expect(mockGitHubClient.createCommit).not.toHaveBeenCalled();
  });

  it("should skip commit when tree is identical to base tree", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
    };
    const context = createMockContext();

    mockResolveFiles.mockResolvedValue(["dist/index.js"]);
    mockReadFilesAsBlobs.mockResolvedValue([
      {
        path: "dist/index.js",
        content: 'console.log("hello")',
        encoding: "utf-8",
      },
    ]);

    // Mock tree creation to return same SHA as base tree
    mockGitHubClient.createTree.mockResolvedValue({
      sha: "tree123", // Same as base tree
      url: "https://api.github.com/repos/owner/repo/git/trees/tree123",
      tree: [],
    });

    await prepare(pluginConfig, context);

    expect(context.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("No changes detected"),
    );
    expect(mockGitHubClient.createCommit).not.toHaveBeenCalled();
    expect(mockGitHubClient.updateRef).not.toHaveBeenCalled();
  });

  it("should use custom commit message", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
      commitMessage: "custom commit message",
    };
    const context = createMockContext();

    mockResolveFiles.mockResolvedValue(["dist/index.js"]);
    mockReadFilesAsBlobs.mockResolvedValue([
      {
        path: "dist/index.js",
        content: 'console.log("hello")',
        encoding: "utf-8",
      },
    ]);

    await prepare(pluginConfig, context);

    expect(mockGitHubClient.createCommit).toHaveBeenCalledWith(
      expect.any(Object),
      "custom commit message",
      expect.any(String),
      expect.any(Array),
      undefined,
      undefined,
    );
  });

  it("should use custom commit message over default", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
      commitMessage: "custom message",
    };
    const context = createMockContext({
      nextRelease: {
        version: "1.0.0",
        gitTag: "v1.0.0",
        gitHead: "abc123",
        notes: "Release notes for v1.0.0",
      },
    });

    mockResolveFiles.mockResolvedValue(["dist/index.js"]);
    mockReadFilesAsBlobs.mockResolvedValue([
      {
        path: "dist/index.js",
        content: 'console.log("hello")',
        encoding: "utf-8",
      },
    ]);

    await prepare(pluginConfig, context);

    expect(mockGitHubClient.createCommit).toHaveBeenCalledWith(
      expect.any(Object),
      "custom message",
      expect.any(String),
      expect.any(Array),
      undefined,
      undefined,
    );
  });

  it("should use default commit message with version template", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
    };
    const context = createMockContext({
      nextRelease: {
        version: "1.0.0",
        gitTag: "v1.0.0",
        gitHead: "abc123",
        notes: "Release notes for v1.0.0",
      },
    });

    mockResolveFiles.mockResolvedValue(["dist/index.js"]);
    mockReadFilesAsBlobs.mockResolvedValue([
      {
        path: "dist/index.js",
        content: 'console.log("hello")',
        encoding: "utf-8",
      },
    ]);

    await prepare(pluginConfig, context);

    expect(mockGitHubClient.createCommit).toHaveBeenCalledWith(
      expect.any(Object),
      "chore(release): 1.0.0 [skip ci]",
      expect.any(String),
      expect.any(Array),
      undefined,
      undefined,
    );
  });

  it("should replace template variables in commit message", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
      commitMessage:
        "release: ${nextRelease.version} tag: ${nextRelease.gitTag}",
    };
    const context = createMockContext({
      nextRelease: {
        version: "1.2.3",
        gitTag: "v1.2.3",
        gitHead: "abc123",
        notes: "Release notes",
      },
    });

    mockResolveFiles.mockResolvedValue(["dist/index.js"]);
    mockReadFilesAsBlobs.mockResolvedValue([
      {
        path: "dist/index.js",
        content: 'console.log("hello")',
        encoding: "utf-8",
      },
    ]);

    await prepare(pluginConfig, context);

    expect(mockGitHubClient.createCommit).toHaveBeenCalledWith(
      expect.any(Object),
      "release: 1.2.3 tag: v1.2.3",
      expect.any(String),
      expect.any(Array),
      undefined,
      undefined,
    );
  });

  it("should handle dry run mode", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
      dryRun: true,
    };
    const context = createMockContext();

    mockResolveFiles.mockResolvedValue(["dist/index.js", "dist/styles.css"]);
    mockReadFilesAsBlobs.mockResolvedValue([
      {
        path: "dist/index.js",
        content: 'console.log("hello")',
        encoding: "utf-8",
      },
      {
        path: "dist/styles.css",
        content: "body { margin: 0; }",
        encoding: "utf-8",
      },
    ]);

    await prepare(pluginConfig, context);

    expect(context.logger.log).toHaveBeenCalledWith(
      "[DRY RUN] Would commit the following files:",
    );
    expect(context.logger.log).toHaveBeenCalledWith(
      "  - dist/index.js (utf-8)",
    );
    expect(context.logger.log).toHaveBeenCalledWith(
      "  - dist/styles.css (utf-8)",
    );
    expect(mockGitHubClient.getRef).not.toHaveBeenCalled();
    expect(mockGitHubClient.createBlob).not.toHaveBeenCalled();
  });

  it("should include author and committer info when provided", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
      authorName: "Test Author",
      authorEmail: "author@example.com",
      committerName: "Test Committer",
      committerEmail: "committer@example.com",
    };
    const context = createMockContext();

    mockResolveFiles.mockResolvedValue(["dist/index.js"]);
    mockReadFilesAsBlobs.mockResolvedValue([
      {
        path: "dist/index.js",
        content: 'console.log("hello")',
        encoding: "utf-8",
      },
    ]);

    await prepare(pluginConfig, context);

    expect(mockGitHubClient.createCommit).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      expect.any(String),
      expect.any(Array),
      { name: "Test Author", email: "author@example.com" },
      { name: "Test Committer", email: "committer@example.com" },
    );
  });

  it("should handle binary files with base64 encoding", async () => {
    const pluginConfig: PluginConfig = {
      files: ["assets/**"],
    };
    const context = createMockContext();

    mockResolveFiles.mockResolvedValue(["assets/logo.png"]);
    mockReadFilesAsBlobs.mockResolvedValue([
      {
        path: "assets/logo.png",
        content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
        encoding: "base64",
      },
    ]);

    await prepare(pluginConfig, context);

    expect(mockGitHubClient.createBlob).toHaveBeenCalledWith(
      expect.any(Object),
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
      "base64",
    );
  });
});
