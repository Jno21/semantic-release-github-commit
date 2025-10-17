import { PluginConfig, SemanticReleaseContext } from "./types";
import { createError } from "./errors";
import { getAuthToken, getRepoInfo } from "./utils";

/**
 * Verify that all required conditions are met
 */
export async function verifyConditions(
  pluginConfig: PluginConfig,
  context: SemanticReleaseContext,
): Promise<void> {
  const { logger, env } = context;

  // Validate GitHub auth token
  try {
    const token = getAuthToken(env, pluginConfig.githubToken);
    logger.log(
      `GitHub authentication token found (${token.substring(0, 4)}...)`,
    );
  } catch (error) {
    throw error;
  }

  // Validate files option
  if (!pluginConfig.files || !Array.isArray(pluginConfig.files)) {
    throw createError(
      "EINVALIDCONFIG",
      'Plugin option "files" must be provided and must be an array',
    );
  }

  if (pluginConfig.files.length === 0) {
    throw createError(
      "ENOFILES",
      'Plugin option "files" must contain at least one file pattern',
    );
  }

  logger.log(`File patterns to commit: ${pluginConfig.files.join(", ")}`);

  // Validate repository info
  try {
    const repoInfo = getRepoInfo(context);
    logger.log(
      `Repository: ${repoInfo.owner}/${repoInfo.repo}, branch: ${repoInfo.branch}`,
    );
  } catch (error) {
    throw error;
  }

  logger.log("Verification successful - all required conditions met");
}
