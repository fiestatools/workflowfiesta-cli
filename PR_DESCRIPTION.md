## Summary

Add CI workflow and simplify the release workflow. Bun can cross-compile all platform targets from Linux, eliminating the need for OS-specific runners.

## Changes

### New CI Workflow (`ci.yml`)
- Runs on push/PR to main branch
- Type checking (`tsc --noEmit`)
- Linting (`eslint`)
- Tests (`bun test`)
- Build verification (single target with `--single` flag)

### Simplified Release Workflow (`release.yml`)
- **Consolidated to single job**: Removed parallel matrix builds across macOS, Linux, and Windows runners
- **Removed artifact upload/download**: No longer needed since everything runs in one job
- **Simplified build step**: Removed `--skip-install` flag so the build script can install cross-platform `@opentui/core` variants
- **Updated action versions**: Using v4 SHA pins for `actions/checkout` and `actions/setup-node`
- **Cleaner release flow**: install → bump version → build all targets → publish → commit → GitHub release

## Why This Works

Bun's cross-compilation support allows building binaries for all platforms (darwin, linux, windows × arm64, x64) from a single Linux runner. The build script handles installing platform-specific `@opentui/core` variants needed for cross-compilation.

## Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Jobs | 4 (3 build + 1 publish) | 1 |
| Runners | macOS, Ubuntu, Windows | Ubuntu only |
| Artifacts | Upload/download between jobs | None needed |
| Complexity | Matrix strategy + artifact merging | Linear steps |
