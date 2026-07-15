# @workflowfiesta/cli

## 0.5.0

### Minor Changes

- [#51](https://github.com/fiestatools/workflowfiesta-cli/pull/51) [`2aa4797`](https://github.com/fiestatools/workflowfiesta-cli/commit/2aa4797dcce901adb7530859ed79ae3cb05dd248) Thanks [@DevAdedeji](https://github.com/DevAdedeji)! - Add account info and a default-agent picker to the settings panel

  - The Account section now shows who you're signed in as (email), your organization name, and the access token in use with its expiry. Org name and user require a recent backend; the panel falls back to the org ID on older servers
  - The raw "Agent ID" text field is replaced with a **Default agent** picker: choose a specific agent to pin it as this CLI's default for new conversations, or "Use account default" to follow the account default set in the web app. Changing it takes effect immediately without a restart. This is distinct from `/agent`, which switches only the current conversation.

## 0.4.0

### Minor Changes

- [#48](https://github.com/fiestatools/workflowfiesta-cli/pull/48) [`72b4584`](https://github.com/fiestatools/workflowfiesta-cli/commit/72b458473ca292a3499eafb6b17ce93c59802f94) Thanks [@DevAdedeji](https://github.com/DevAdedeji)! - Render guard-agent verdicts (Auth Cop, Secret Safe, Helping Hand) as distinct bubbles

  - Auth Cop security reviews show with their decision badge (approved / awaiting confirmation / declined), a waiting notice when the agent needs your reply, and an escalation hint when declined
  - Secret Safe redaction notices and Helping Hand suggestions render with their own headers and accent colors, matching the web app
  - Previously these messages were appended into the assistant's reply text (or lost entirely once the run finished); the run stream now stays open after completion so post-run verdicts arrive, and they are excluded from reply reconciliation
  - Reopened conversations render stored guard verdicts the same way

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
