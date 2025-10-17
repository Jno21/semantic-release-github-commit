/**
 * Test configuration for semantic-release
 * This file can be renamed to release.config.js to test the plugin
 */

module.exports = {
  branches: ["main", { name: "beta", prerelease: true }],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    [
      "./dist/index.js",
      {
        files: ["package.json", "package-lock.json"],
        commitMessage:
          "chore(release): update package.json version to ${nextRelease.version} [skip ci]",
      },
    ],
    "@semantic-release/github",
  ],
};
