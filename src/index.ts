import { PluginConfig, SemanticReleaseContext } from './types';
import { verifyConditions as verify } from './verify';
import { prepare as prep } from './prepare';

/**
 * Verify that all required conditions are met for the plugin to run
 */
export async function verifyConditions(
  pluginConfig: PluginConfig,
  context: SemanticReleaseContext
): Promise<void> {
  return verify(pluginConfig, context);
}

/**
 * Commit specified files to GitHub during the prepare step
 */
export async function prepare(
  pluginConfig: PluginConfig,
  context: SemanticReleaseContext
): Promise<void> {
  return prep(pluginConfig, context);
}
