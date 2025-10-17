# @jno21/semantic-release-github-commit

[**semantic-release**](https://github.com/semantic-release/semantic-release) plugin to commit release assets to GitHub using the REST API.

[![npm](https://img.shields.io/npm/v/@jno21/semantic-release-github-commit.svg)](https://www.npmjs.com/package/@jno21/semantic-release-github-commit)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

| Step               | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `verifyConditions` | Verify GitHub authentication and configuration                              |
| `prepare`          | Create a commit with the specified files using the GitHub API              |

## Why use this plugin?

### The Problem

In production environments with protected branches, you need to commit release artifacts (build files, changelogs, etc.) during the release process.

The basic `GITHUB_TOKEN` provided by GitHub Actions can create releases, but **cannot push to protected branches**. You have two options:

1. **Use a Personal Access Token (PAT)** - Allows pushing to protected branches by adding the user to bypass rules
2. **Use a GitHub App token** - Allows pushing to protected branches by adding the app to bypass rules

However, when using `@semantic-release/git` with either option, **commits are not signed**, which fails security policies requiring verified commits.

### The Solution

This plugin uses the **GitHub REST API** to create commits, which enables automatic commit signing when using a GitHub App token.

**Result:** Verified commits with the green checkmark ✓, no GPG keys required.

**vs. @semantic-release/git:**
- `@semantic-release/git` uses local git commands → commits are **not verified**
- This plugin uses GitHub REST API → commits are **automatically verified** with GitHub App tokens

## Install

```bash
npm install --save-dev @jno21/semantic-release-github-commit
```

> **New to this plugin?** See the [Complete Setup Guide](./docs/setup-guide.md) for step-by-step instructions on setting up a GitHub App and configuring your workflow from scratch.

## Usage

The plugin requires a GitHub authentication token with `contents: write` permission.

> **Note:** Using a GitHub App token is recommended for automatic commit verification.

```js
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    [
      "@jno21/semantic-release-github-commit",
      {
        "files": ["dist/**", "CHANGELOG.md", "package.json"]
      }
    ],
    "@semantic-release/github"
  ]
}
```

## Configuration

### GitHub authentication

The GitHub authentication token can be configured via environment variables or plugin options:

| Variable | Description |
|----------|-------------|
| `GH_TOKEN` | GitHub token (preferred) |
| `GITHUB_TOKEN` | GitHub token (fallback) |

**GitHub Actions example with GitHub App:**

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - uses: actions/create-github-app-token@v2
        id: app-token
        with:
          app-id: ${{ vars.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run build

      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
```

> **Tip:** Using `actions/create-github-app-token` enables automatic commit verification. The plugin automatically detects and ignores semantic-release's default bot identity to allow GitHub to sign commits with your app.

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `files` | Array of file paths or [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns) to commit. **Required.** | - |
| `commitMessage` | Commit message template. Supports [Lodash template](https://lodash.com/docs#template) variables. | `chore(release): ${nextRelease.version} [skip ci]` |
| `authorName` | Git author name override. | - |
| `authorEmail` | Git author email override. | - |
| `committerName` | Git committer name override. | - |
| `committerEmail` | Git committer email override. | - |
| `githubToken` | GitHub authentication token (fallback if env vars not set). | - |
| `dryRun` | Log operations without executing them. | `false` |

#### `files`

Array of file paths or glob patterns relative to the repository root.

**Examples:**

```js
{
  "files": [
    "dist/**",           // All files in dist directory
    "*.{json,md}",       // JSON and Markdown files in root
    "CHANGELOG.md",      // Specific file
    "package.json"
  ]
}
```

The plugin uses [globby](https://github.com/sindresorhus/globby) for pattern matching.

#### `commitMessage`

Commit message template supporting these variables:

- `${nextRelease.version}` - Release version (e.g., `1.2.3`)
- `${nextRelease.gitTag}` - Git tag (e.g., `v1.2.3`)
- `${nextRelease.gitHead}` - Commit SHA
- `${nextRelease.notes}` - Release notes

**Example:**

```js
{
  "commitMessage": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
}
```

> **Note:** Include `[skip ci]` to prevent the commit from triggering another workflow run.

#### Author and Committer Identity

By default, the plugin omits author and committer information to enable **GitHub App auto-signing**. This gives your commits the verified badge automatically.

If you provide custom identity via `authorName`/`authorEmail`/`committerName`/`committerEmail`, commits will **not** be auto-signed by GitHub.

**For verified commits with GitHub Apps:**
```js
{
  "files": ["dist/**"]
  // Don't specify author/committer - let GitHub auto-sign
}
```

**For custom identity (no verification):**
```js
{
  "files": ["dist/**"],
  "authorName": "Release Bot",
  "authorEmail": "bot@example.com"
}
```

## Examples

### Basic configuration

```js
{
  "plugins": [
    ["@jno21/semantic-release-github-commit", {
      "files": ["dist/**", "CHANGELOG.md"]
    }]
  ]
}
```

### Custom commit message with release notes

```js
{
  "plugins": [
    ["@jno21/semantic-release-github-commit", {
      "files": ["dist/**", "package.json"],
      "commitMessage": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }]
  ]
}
```

### Multiple file patterns

```js
{
  "plugins": [
    ["@jno21/semantic-release-github-commit", {
      "files": [
        "dist/**/*.js",
        "dist/**/*.css",
        "*.{json,md}",
        "!**/*.map"  // Exclude source maps
      ]
    }]
  ]
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `EGHNOAUTH` | No GitHub authentication token found |
| `ENOFILES` | No files found or invalid file patterns |
| `EGHAPI` | GitHub API error |
| `ENOREPO` | Repository URL not found or invalid |
| `ENOBRANCH` | Branch name could not be detected |
| `EINVALIDCONFIG` | Invalid plugin configuration |

## License

MIT
