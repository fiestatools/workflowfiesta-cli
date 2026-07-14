# @workflowfiesta/cli

## 0.3.1

### Patch Changes

- [#45](https://github.com/fiestatools/workflowfiesta-cli/pull/45) [`4bd46db`](https://github.com/fiestatools/workflowfiesta-cli/commit/4bd46db98cb75166381e2689649355d775b853e9) Thanks [@awaitimport](https://github.com/awaitimport)! - Fix macOS code signing error when loading OpenTUI native library

## 0.3.0

### Minor Changes

- [#43](https://github.com/fiestatools/workflowfiesta-cli/pull/43) [`39c9715`](https://github.com/fiestatools/workflowfiesta-cli/commit/39c9715e162402a4b941dad7880e120717ffb201) Thanks [@DevAdedeji](https://github.com/DevAdedeji)! - Add conversation management to the `/history` overlay

  - Rename a conversation inline with `r` (Enter saves, Esc cancels)
  - Deleting with `d` now asks for confirmation (`y`/`n`) instead of deleting immediately
  - Mark multiple conversations with `Space` and delete them in one confirmed action
  - New `/rename <new title>` command renames the current conversation directly; the command palette now supports argument-taking commands
  - Pressing Enter on an argument-taking command without arguments completes it in the input (like Tab) instead of executing
  - Fix inline text edits (history rename, settings fields) saving the pre-edit value: opentui inputs only emit `change` on blur/submit, so per-keystroke state now uses `onInput`

## 0.2.1

### Patch Changes

- [#40](https://github.com/fiestatools/workflowfiesta-cli/pull/40) [`01945dd`](https://github.com/fiestatools/workflowfiesta-cli/commit/01945dd9daad8250626c59696fe7b801bc21b66c) Thanks [@awaitimport](https://github.com/awaitimport)! - Fix modal/dialog focus trapping where up/down arrow keys would cycle through prompt history instead of navigating within the dialog. Also fix Windows CI CodeSignTool extraction to handle zip files that extract contents directly rather than into a subdirectory.

## 0.2.0

### Minor Changes

- [#38](https://github.com/fiestatools/workflowfiesta-cli/pull/38) [`c79e419`](https://github.com/fiestatools/workflowfiesta-cli/commit/c79e4197307016a045c661d9b69420ce1514fc8e) Thanks [@awaitimport](https://github.com/awaitimport)! - Add `/status` command, `Ctrl+Y` copy shortcut, and message timestamps

  - Add `/status` command to show connection status, current agent, and conversation info
  - Add `Ctrl+Y` keyboard shortcut to quickly copy the last assistant reply to clipboard
  - Display timestamps (HH:MM) next to each message in the chat view

## 0.1.1

### Patch Changes

- [#35](https://github.com/fiestatools/workflowfiesta-cli/pull/35) [`eaf4083`](https://github.com/fiestatools/workflowfiesta-cli/commit/eaf40833d0dd70c6a7dd6861d187bcf33b079f4a) Thanks [@awaitimport](https://github.com/awaitimport)! - Add missing spaces in components and add missing shortcut in HepDialog

## 0.1.0

### Minor Changes

- [#32](https://github.com/fiestatools/workflowfiesta-cli/pull/32) [`daba5fb`](https://github.com/fiestatools/workflowfiesta-cli/commit/daba5fb51ffe869fd19f27957bd4c09c0c2f993b) Thanks [@awaitimport](https://github.com/awaitimport)! - Add input history navigation with up/down arrow keys to cycle through previously submitted prompts

## 0.0.3

### Patch Changes

- [#28](https://github.com/fiestatools/workflowfiesta-cli/pull/28) [`c4e5e0a`](https://github.com/fiestatools/workflowfiesta-cli/commit/c4e5e0a6e137e7ae4cd835b7fdf5c2177c6e0510) Thanks [@awaitimport](https://github.com/awaitimport)! - Fix shift+enter to insert newline in chat input

## 0.0.2

### Patch Changes

- [#25](https://github.com/fiestatools/workflowfiesta-cli/pull/25) [`f2215ad`](https://github.com/fiestatools/workflowfiesta-cli/commit/f2215ad5786c7149577d5cb7e174ce13aa1a98c7) Thanks [@awaitimport](https://github.com/awaitimport)! - Fix release asset naming and add install script

  - Rename release assets from `cli-*` to `workflowfiesta-*`
  - Release tarballs now contain only the binary (not the full npm package)
  - Add install script for easy installation via curl

## Changelog

All notable changes to this project will be documented in this file.
