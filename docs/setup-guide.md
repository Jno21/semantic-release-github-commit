# Complete Setup Guide

This guide walks you through setting up `@jno21/semantic-release-github-commit` from scratch with a GitHub App for verified commits on protected branches.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create a GitHub App](#step-1-create-a-github-app)
3. [Step 2: Install the App](#step-2-install-the-app)
4. [Step 3: Store Credentials as Secrets](#step-3-store-credentials-as-secrets)
5. [Step 4: Configure Branch Protection](#step-4-configure-branch-protection)
6. [Step 5: Setup Your Release Workflow](#step-5-setup-your-release-workflow)
7. [Step 6: Test Your Setup](#step-6-test-your-setup)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- A GitHub repository with protected branches (e.g., `main`)
- Admin access to your GitHub organization or repository
- Node.js 20+ installed locally for testing
- Basic understanding of semantic-release and GitHub Actions

---

## Step 1: Create a GitHub App

### 1.1 Navigate to GitHub App Settings

**For an organization:**
1. Go to your organization page on GitHub
2. Click **Settings** → **Developer settings** → **GitHub Apps**
3. Click **New GitHub App**

**For a personal repository:**
1. Go to your GitHub profile **Settings**
2. Click **Developer settings** → **GitHub Apps**
3. Click **New GitHub App**

### 1.2 Configure the GitHub App

Fill in the required fields:

| Field | Value |
|-------|-------|
| **GitHub App name** | `my-semantic-releaser` (must be globally unique) |
| **Description** | Internal bot for automated releases with verified commits |
| **Homepage URL** | Your repository or organization URL |
| **Webhook** | Uncheck "Active" (not needed for this use case) |

### 1.3 Set Permissions

Under **Repository permissions**, configure:

| Permission | Access | Why |
|------------|--------|-----|
| **Contents** | Read and write | Required to push commits and create releases |
| **Metadata** | Read-only | Automatically selected |
| **Pull requests** | Read and write | (Optional) If you want to comment on PRs |
| **Issues** | Read and write | (Optional) If using `@semantic-release/github` to comment on issues |

> **Note:** Only request the minimum permissions you need. For basic usage, only `Contents: Read and write` is required.

### 1.4 Installation Restrictions

Under **Where can this GitHub App be installed?**, select:
- **Only on this account** (recommended for security)

### 1.5 Create the App

Click **Create GitHub App** at the bottom of the page.

### 1.6 Generate a Private Key

After creation, you'll be on the app's settings page:

1. Scroll down to **Private keys**
2. Click **Generate a private key**
3. A `.pem` file will download automatically
4. **Important:** Store this file securely - you cannot download it again

### 1.7 Note the App ID

At the top of the page, you'll see:
- **App ID:** `123456` ← Copy this number

---

## Step 2: Install the App

### 2.1 Install to Repository

1. On the app settings page, click **Install App** in the left sidebar
2. Click **Install** next to your organization or account
3. Choose **Only select repositories**
4. Select the repository where you want to use semantic-release
5. Click **Install**

---

## Step 3: Store Credentials as Secrets

### 3.1 Prepare the Private Key

Open the downloaded `.pem` file in a text editor. It should look like:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----
```

Copy the **entire contents** including the BEGIN and END lines.

### 3.2 Add Repository Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add these two secrets:

| Name | Value |
|------|-------|
| `APP_ID` | The App ID from Step 1.7 (e.g., `123456`) |
| `APP_PRIVATE_KEY` | The entire contents of the `.pem` file |

> **Tip:** For organization-level apps used across multiple repositories, you can create **organization secrets** instead.

---

## Step 4: Configure Branch Protection

If your `main` branch has protection rules requiring pull requests, you need to allow the GitHub App to bypass them.

### 4.1 Navigate to Branch Protection

1. Go to **Settings** → **Branches**
2. Click **Edit** on your `main` branch protection rule

### 4.2 Allow App to Bypass

Scroll down to **Rules applied to everyone including administrators**:

1. Find the section that says **Restrict who can push to matching branches**
2. Click **Add apps**
3. Search for and select `my-semantic-releaser` (your app name)
4. Click **Save changes**

> **Note:** This allows the app to push commits directly to protected branches without pull requests.

---

## Step 5: Setup Your Release Workflow

You have two options for running semantic-release in GitHub Actions:

### Option 1: Using npx (Recommended for flexibility)

This option gives you full control over semantic-release and plugin versions.

**Step 1: Install the plugin**

Install the plugin as a dev dependency:

```bash
npm install --save-dev @jno21/semantic-release-github-commit
```

Or with yarn:

```bash
yarn add --dev @jno21/semantic-release-github-commit
```

**Step 2: Configure semantic-release**

Create or update your `release.config.js`:

```js
module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/npm',
    [
      '@jno21/semantic-release-github-commit',
      {
        files: [
          'dist/**',           // Build artifacts
          'CHANGELOG.md',       // If using @semantic-release/changelog
          'package.json',       // Updated version
          'package-lock.json'   // Updated version
        ],
        commitMessage: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ],
    '@semantic-release/github'
  ]
};
```

> **Important:** Place `@jno21/semantic-release-github-commit` **before** `@semantic-release/github` so the commit is created before the GitHub release.

**Common configurations:**

<details>
<summary>With Changelog</summary>

```js
module.exports = {
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md'
      }
    ],
    '@semantic-release/npm',
    [
      '@jno21/semantic-release-github-commit',
      {
        files: ['dist/**', 'CHANGELOG.md', 'package.json', 'package-lock.json']
      }
    ],
    '@semantic-release/github'
  ]
};
```
</details>

<details>
<summary>Without npm Publish</summary>

```js
module.exports = {
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@jno21/semantic-release-github-commit',
      {
        files: ['dist/**', 'CHANGELOG.md']
      }
    ],
    '@semantic-release/github'
  ]
};
```
</details>

**Step 3: Create GitHub Actions workflow**

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    # Prevent duplicate runs on release commits
    if: "!contains(github.event.head_commit.message, '[skip ci]')"

    steps:
      - name: Checkout
        uses: actions/checkout@v5
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Create GitHub App Token
        uses: actions/create-github-app-token@v2
        id: app-token
        with:
          app-id: ${{ vars.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}

      - name: Release
        env:
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

**Key Points:**
- **`persist-credentials: false`** - Prevents conflicts with the GitHub App token
- **`fetch-depth: 0`** - Required for semantic-release to analyze commit history
- **`if: "!contains(..., '[skip ci]')"`** - Prevents infinite loops from release commits
- **GitHub App token** - Created dynamically and used instead of default `GITHUB_TOKEN`

### Option 2: Using semantic-release-action

Alternatively, use the [cycjimmy/semantic-release-action](https://github.com/cycjimmy/semantic-release-action).

> **Note:** With this option, you **don't need to install** the plugin in your package.json. The action will install it automatically via `extra_plugins`.

**Step 1: Configure semantic-release**

Create or update your `release.config.js`:

```js
module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/npm',
    [
      '@jno21/semantic-release-github-commit',
      {
        files: [
          'dist/**',
          'CHANGELOG.md',
          'package.json',
          'package-lock.json'
        ],
        commitMessage: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ],
    '@semantic-release/github'
  ]
};
```

**Step 2: Create GitHub Actions workflow**

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    if: "!contains(github.event.head_commit.message, '[skip ci]')"

    steps:
      - name: Checkout
        uses: actions/checkout@v5
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Create GitHub App Token
        uses: actions/create-github-app-token@v2
        id: app-token
        with:
          app-id: ${{ vars.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}

      - name: Semantic Release
        uses: cycjimmy/semantic-release-action@v5
        with:
          extra_plugins: |
            @jno21/semantic-release-github-commit
        env:
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Benefits of semantic-release-action:**
- No need to install semantic-release in your package.json
- Automatically caches dependencies
- Provides outputs you can use in subsequent steps (e.g., `new_release_version`)

**Using the outputs:**

```yaml
      - name: Semantic Release
        uses: cycjimmy/semantic-release-action@v5
        id: semantic
        with:
          extra_plugins: |
            @jno21/semantic-release-github-commit
        env:
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Notify on new release
        if: steps.semantic.outputs.new_release_published == 'true'
        run: |
          echo "New release: ${{ steps.semantic.outputs.new_release_version }}"
          echo "Release notes: ${{ steps.semantic.outputs.new_release_notes }}"
```

**Available outputs:**
- `new_release_published` - `'true'` if a new release was published
- `new_release_version` - Version number (e.g., `1.2.3`)
- `new_release_major_version` - Major version (e.g., `1`)
- `new_release_minor_version` - Minor version (e.g., `2`)
- `new_release_patch_version` - Patch version (e.g., `3`)
- `new_release_git_tag` - Git tag (e.g., `v1.2.3`)
- `new_release_notes` - Release notes

### Using Organization Secrets

If you stored `APP_ID` and `APP_PRIVATE_KEY` as organization secrets:

```yaml
      - name: Create GitHub App Token
        uses: actions/create-github-app-token@v1
        id: app-token
        with:
          app-id: ${{ vars.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}
```

Variables can use `vars` context, secrets use `secrets` context.

---

## Step 6: Test Your Setup

### 6.1 Make a Test Commit

Create a commit that triggers a release (using [Conventional Commits](https://www.conventionalcommits.org/)):

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

### 6.2 Monitor the Workflow

1. Go to the **Actions** tab in your repository
2. Watch the **Release** workflow run
3. Check the logs for each step

### 6.3 Verify Success

After the workflow completes, verify:

1. **New release created** - Check the **Releases** page
2. **Commit is verified** - The release commit should have a green "Verified" badge
3. **Files committed** - Check that `dist/`, `CHANGELOG.md`, etc. are updated
4. **Tag points to correct commit** - The release tag should include the plugin's commit

---

## Troubleshooting

### Workflow fails with "Resource not accessible by integration"

**Cause:** The GitHub App doesn't have the required permissions.

**Solution:**
1. Go to your GitHub App settings
2. Check **Repository permissions** → **Contents** is set to "Read and write"
3. If you changed permissions, reinstall the app to your repository

### Commits are not verified

**Cause:** Not using a GitHub App token, or custom identity is specified.

**Solution:**
1. Ensure you're using `actions/create-github-app-token@v1` in your workflow
2. Don't specify `authorName`, `authorEmail`, `committerName`, or `committerEmail` in plugin config
3. Verify the token is passed as `GITHUB_TOKEN` environment variable

### "Failed to update ref" or "Reference update failed"

**Cause:** Branch protection rules prevent the app from pushing.

**Solution:**
1. Go to **Settings** → **Branches** → Edit protection rule for `main`
2. Under "Restrict who can push to matching branches", add your GitHub App
3. Save changes

### Workflow runs twice (infinite loop)

**Cause:** The release commit triggers another workflow run.

**Solution:**
1. Add `[skip ci]` to your commit message:
   ```js
   {
     commitMessage: 'chore(release): ${nextRelease.version} [skip ci]'
   }
   ```
2. Add conditional to workflow:
   ```yaml
   if: "!contains(github.event.head_commit.message, '[skip ci]')"
   ```

### "No files matched the provided patterns"

**Cause:** Files don't exist or patterns are incorrect.

**Solution:**
1. Ensure files are built before running semantic-release:
   ```yaml
   - run: npm run build
   - run: npx semantic-release
   ```
2. Verify patterns match your file structure
3. Check working directory is the repository root

### "Authentication failed" during git fetch

**Cause:** Git credentials conflict or token expired.

**Solution:**
1. Add `persist-credentials: false` to checkout step
2. Ensure GitHub App token is generated before semantic-release runs
3. Verify `APP_PRIVATE_KEY` secret is correct

### Debugging

Enable debug mode to see detailed logs:

```yaml
- name: Release
  env:
    GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
  run: npx semantic-release --debug
```

---

## Next Steps

- Read [VERIFIED_COMMITS.md](../VERIFIED_COMMITS.md) for details on commit verification
- See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for more common issues
- Check out [Configuration Options](../README.md#configuration) in the README

---

## Additional Resources

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [actions/create-github-app-token](https://github.com/actions/create-github-app-token)
- [semantic-release Documentation](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
