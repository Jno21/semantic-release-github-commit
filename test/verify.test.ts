import { verifyConditions } from "../src/verify";
import { PluginConfig, SemanticReleaseContext } from "../src/types";

const createMockContext = (
  overrides?: Partial<SemanticReleaseContext>,
): SemanticReleaseContext =>
  ({
    env: {
      GITHUB_TOKEN: "test-token",
    },
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

describe("verifyConditions", () => {
  it("should pass verification with valid config", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**", "CHANGELOG.md"],
    };
    const context = createMockContext();

    await expect(
      verifyConditions(pluginConfig, context),
    ).resolves.toBeUndefined();
    expect(context.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Verification successful"),
    );
  });

  it("should throw error when no auth token is available", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
    };
    const context = createMockContext({
      env: {},
    });

    await expect(verifyConditions(pluginConfig, context)).rejects.toThrow(
      "No GitHub authentication token found",
    );
  });

  it("should use GH_TOKEN if GITHUB_TOKEN is not available", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
    };
    const context = createMockContext({
      env: {
        GH_TOKEN: "gh-token",
      },
    });

    await expect(
      verifyConditions(pluginConfig, context),
    ).resolves.toBeUndefined();
  });

  it("should use githubToken from config if env vars are not available", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
      githubToken: "config-token",
    };
    const context = createMockContext({
      env: {},
    });

    await expect(
      verifyConditions(pluginConfig, context),
    ).resolves.toBeUndefined();
  });

  it("should throw error when files option is missing", async () => {
    const pluginConfig = {} as PluginConfig;
    const context = createMockContext();

    await expect(verifyConditions(pluginConfig, context)).rejects.toThrow(
      'files" must be provided',
    );
  });

  it("should throw error when files option is not an array", async () => {
    const pluginConfig = {
      files: "not-an-array",
    } as any;
    const context = createMockContext();

    await expect(verifyConditions(pluginConfig, context)).rejects.toThrow(
      'files" must be provided and must be an array',
    );
  });

  it("should throw error when files array is empty", async () => {
    const pluginConfig: PluginConfig = {
      files: [],
    };
    const context = createMockContext();

    await expect(verifyConditions(pluginConfig, context)).rejects.toThrow(
      "must contain at least one file pattern",
    );
  });

  it("should throw error when repository URL is missing", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
    };
    const context = createMockContext({
      options: {} as any,
    });

    await expect(verifyConditions(pluginConfig, context)).rejects.toThrow(
      "No repository URL found",
    );
  });

  it("should detect branch from GITHUB_REF env variable", async () => {
    const pluginConfig: PluginConfig = {
      files: ["dist/**"],
    };
    const context = createMockContext({
      env: {
        GITHUB_TOKEN: "test-token",
        GITHUB_REF: "refs/heads/main",
      },
    });

    await expect(
      verifyConditions(pluginConfig, context),
    ).resolves.toBeUndefined();
    expect(context.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("branch: main"),
    );
  });
});
