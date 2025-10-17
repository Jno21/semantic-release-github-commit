import { PluginConfig, SemanticReleaseContext } from "./types";
import { GitHubClient } from "./github";
import { resolveFiles, readFilesAsBlobs } from "./files";
import { getAuthToken, getRepoInfo, getGitIdentity } from "./utils";
import { execa } from "execa";

/**
 * Prepare and commit files to GitHub
 */
export async function prepare(
  pluginConfig: PluginConfig,
  context: SemanticReleaseContext,
): Promise<void> {
  const { logger, env, cwd = process.cwd(), nextRelease } = context;
  const isDryRun = pluginConfig.dryRun || false;

  // Get auth token and repo info
  const token = getAuthToken(env, pluginConfig.githubToken);
  const repoInfo = getRepoInfo(context);

  logger.log(
    `Preparing to commit files to ${repoInfo.owner}/${repoInfo.repo}:${repoInfo.branch}`,
  );

  // Initialize GitHub client
  const github = new GitHubClient(token);

  // Resolve file patterns to actual files
  logger.log(`Resolving file patterns: ${pluginConfig.files.join(", ")}`);
  const filePaths = await resolveFiles(pluginConfig.files, cwd);

  if (filePaths.length === 0) {
    logger.warn("No files matched the provided patterns - skipping commit");
    return;
  }

  logger.log(`Resolved ${filePaths.length} file(s): ${filePaths.join(", ")}`);

  // Read file contents
  logger.log("Reading file contents...");
  const fileBlobs = await readFilesAsBlobs(filePaths, cwd);

  if (isDryRun) {
    logger.log("[DRY RUN] Would commit the following files:");
    fileBlobs.forEach((blob) => {
      logger.log(`  - ${blob.path} (${blob.encoding})`);
    });
    logger.log("[DRY RUN] Skipping actual commit creation");
    return;
  }

  // Get current ref
  logger.log(`Getting current ref for branch ${repoInfo.branch}...`);
  const ref = await github.getRef(repoInfo);
  const currentCommitSha = ref.object.sha;
  logger.log(`Current commit: ${currentCommitSha}`);

  // Get current commit to get the base tree
  const currentCommit = await github.getCommit(repoInfo, currentCommitSha);
  const baseTreeSha = currentCommit.tree.sha;
  logger.log(`Base tree: ${baseTreeSha}`);

  // Create blobs for each file
  logger.log(`Creating ${fileBlobs.length} blob(s)...`);
  const blobsWithSha = await Promise.all(
    fileBlobs.map(async (blob) => {
      const githubBlob = await github.createBlob(
        repoInfo,
        blob.content,
        blob.encoding,
      );
      return {
        path: blob.path,
        sha: githubBlob.sha,
      };
    }),
  );

  logger.log(`Created ${blobsWithSha.length} blob(s)`);

  // Create tree with updated files
  logger.log("Creating tree...");
  const tree = await github.createTree(repoInfo, baseTreeSha, blobsWithSha);
  logger.log(`Created tree: ${tree.sha}`);

  // Check if tree is different from base tree (idempotency)
  if (tree.sha === baseTreeSha) {
    logger.log(
      "No changes detected - tree is identical to base tree. Skipping commit.",
    );
    return;
  }

  // Prepare commit message
  let commitMessage =
    pluginConfig.commitMessage ||
    `chore(release): \${nextRelease.version} [skip ci]`;

  // Replace template variables
  if (commitMessage && nextRelease) {
    commitMessage = commitMessage
      .replace(/\$\{nextRelease\.version\}/g, nextRelease.version)
      .replace(/\$\{nextRelease\.gitTag\}/g, nextRelease.gitTag)
      .replace(/\$\{nextRelease\.gitHead\}/g, nextRelease.gitHead);
  } else if (!nextRelease) {
    // Fallback if no nextRelease context
    commitMessage = commitMessage || "chore(release): update [skip ci]";
  }

  // Get author/committer info if provided
  // Note: If not provided, they remain undefined and GitHub will auto-sign commits
  const author = getGitIdentity(
    env,
    "author",
    pluginConfig.authorName,
    pluginConfig.authorEmail,
  );
  const committer = getGitIdentity(
    env,
    "committer",
    pluginConfig.committerName,
    pluginConfig.committerEmail,
  );

  if (author || committer) {
    logger.log(`Using custom identity - commit will NOT be auto-signed:`);
    if (author) logger.log(`  Author: ${author.name} <${author.email}>`);
    if (committer)
      logger.log(`  Committer: ${committer.name} <${committer.email}>`);
  } else {
    logger.log(
      "No custom identity provided - GitHub will auto-sign with authenticated app/bot",
    );
  }

  // Create commit
  logger.log("Creating commit...");
  const commit = await github.createCommit(
    repoInfo,
    commitMessage,
    tree.sha,
    [currentCommitSha],
    author,
    committer,
  );

  logger.log(`Created commit: ${commit.sha}`);

  // Update ref to point to new commit
  logger.log(`Updating ref ${repoInfo.branch} to ${commit.sha}...`);
  await github.updateRef(repoInfo, commit.sha);

  // Fetch the new commit into the local repository
  // This is critical for semantic-release to include this commit in the release tag
  logger.log("Fetching new commit into local repository...");
  try {
    // Configure git to use the GitHub token for this fetch
    const repositoryUrl = context.options.repositoryUrl || "";
    const authenticatedUrl = repositoryUrl.replace(
      "https://github.com/",
      `https://x-access-token:${token}@github.com/`,
    );

    // Set the remote URL with authentication
    await execa("git", ["remote", "set-url", "origin", authenticatedUrl], {
      cwd,
      env,
    });

    // Fetch the new commit
    await execa("git", ["fetch", "origin", repoInfo.branch], { cwd, env });

    // Reset to the fetched commit
    await execa("git", ["reset", "--hard", `origin/${repoInfo.branch}`], {
      cwd,
      env,
    });

    logger.log(`Local repository updated to ${commit.sha}`);
  } catch (error: any) {
    logger.error(
      "Failed to fetch new commit into local repository:",
      error.message,
    );
    throw error;
  }

  // Update nextRelease.gitHead so semantic-release uses the correct commit
  if (nextRelease) {
    nextRelease.gitHead = commit.sha;
    logger.log(`Updated nextRelease.gitHead to ${commit.sha}`);
  }

  logger.log(
    `✓ Successfully committed ${fileBlobs.length} file(s) in commit ${commit.sha}`,
  );
}
