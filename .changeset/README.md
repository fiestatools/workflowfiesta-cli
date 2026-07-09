# Changesets

This folder contains "changesets" - markdown files that describe changes you've made.

## Adding a changeset

When you make a change that affects the CLI, add a changeset by running:

```bash
bun changeset
```

This will prompt you to:
1. Select the type of change (patch/minor/major)
2. Write a summary of the change

The changeset file will be committed with your PR.

## Release Process

When changesets are merged to main, a "Release PR" is automatically created that:
- Bumps the version based on accumulated changesets
- Updates the CHANGELOG.md
- When merged, publishes to npm and creates a GitHub release

See the [release workflow](../.github/workflows/release.yml) for details.
