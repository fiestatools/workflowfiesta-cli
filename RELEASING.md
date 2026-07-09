# Releasing the CLI

This document describes the release process for the WorkflowFiesta CLI using [Changesets](https://github.com/changesets/changesets).

## Overview

We use a **Release PR workflow** instead of pushing tags directly from the main branch. This provides:

- Clear audit trail of all releases
- Code review for version bumps and changelogs
- CI validation before releases are published
- Automatic changelog generation with GitHub PR/issue links

## How It Works

```
Feature PR ──► main ──► Release PR (auto-created) ──► Merge ──► npm publish + GitHub Release
     │                         │
     └── Add changeset         └── Version bump + CHANGELOG update
```

## Developer Workflow

### 1. Add a changeset when making changes

When you make a change that should be included in the changelog, run:

```bash
bun changeset
```

This will prompt you to:

1. **Select the package** - Just press Enter (we only have one package)
2. **Select bump type**:
   - `patch` - Bug fixes, minor improvements (0.0.x)
   - `minor` - New features, non-breaking changes (0.x.0)  
   - `major` - Breaking changes (x.0.0)
3. **Write a summary** - Describe what changed (this appears in CHANGELOG.md)

A markdown file will be created in `.changeset/` - commit this with your PR.

### 2. Example changeset file

After running `bun changeset`, you'll have a file like `.changeset/fuzzy-lions-dance.md`:

```markdown
---
"@workflowfiesta/cli": minor
---

Add dark mode support to the settings panel
```

### 3. Multiple changes in one PR

You can add multiple changesets if your PR contains multiple distinct changes:

```bash
bun changeset  # For feature A
bun changeset  # For feature B
```

### 4. No changeset needed for

- Documentation-only changes
- CI/tooling updates
- Refactoring with no user-facing changes

## Release Process

### Automatic (Recommended)

1. When PRs with changesets are merged to `main`, the GitHub Action automatically creates/updates a **Release PR**
2. The Release PR accumulates all pending changesets and shows:
   - The new version number
   - All changelog entries
3. When ready to release, a maintainer merges the Release PR
4. On merge, the workflow automatically:
   - Publishes to npm
   - Builds CLI binaries for all platforms
   - Creates a GitHub Release with binary assets

### What the Release PR looks like

The auto-created Release PR will have:
- Title: `chore: release CLI`
- Updated `package.json` version
- Updated `CHANGELOG.md`
- All changeset files removed (consumed)

## Manual Release (Emergency Only)

If you need to release without the automated workflow:

```bash
# 1. Ensure you're on main and up to date
git checkout main && git pull

# 2. Version bump (consumes changesets)
bun changeset version

# 3. Review changes
git diff

# 4. Commit
git add -A && git commit -m "chore: release vX.Y.Z"

# 5. Build and publish
bun run release:publish

# 6. Push
git push

# 7. Create GitHub release manually
gh release create vX.Y.Z --generate-notes
```

## Scripts Reference

| Command | Description |
|---------|-------------|
| `bun changeset` | Add a new changeset |
| `bun changeset version` | Apply changesets and bump version |
| `bun changeset status` | See pending changesets |
| `bun run release:publish` | Build and publish to npm |

## Troubleshooting

### "No changesets found"

The Release PR won't be created if there are no `.changeset/*.md` files (excluding README.md and config.json). Make sure contributors add changesets with their PRs.

### Release PR not updating

The workflow runs on every push to `main`. Check the Actions tab for errors.

### npm publish failed

Ensure `NPM_TOKEN` secret is set in repository settings with publish access to `@workflowfiesta/cli`.

## Configuration

The changesets configuration is in `.changeset/config.json`:

```json
{
  "changelog": ["@changesets/changelog-github", { "repo": "fiestatools/workflowfiesta-cli" }],
  "access": "restricted",
  "baseBranch": "main"
}
```

- `changelog` - Uses GitHub-flavored changelog with PR/commit links
- `access` - Set to `"public"` when ready for public npm releases
- `baseBranch` - The branch to create Release PRs against
