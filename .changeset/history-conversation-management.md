---
"@workflowfiesta/cli": minor
---

Add conversation management to the `/history` overlay

- Rename a conversation inline with `r` (Enter saves, Esc cancels)
- Deleting with `d` now asks for confirmation (`y`/`n`) instead of deleting immediately
- Mark multiple conversations with `Space` and delete them in one confirmed action
- New `/rename <new title>` command renames the current conversation directly; the command palette now supports argument-taking commands
- Pressing Enter on an argument-taking command without arguments completes it in the input (like Tab) instead of executing
- Fix inline text edits (history rename, settings fields) saving the pre-edit value: opentui inputs only emit `change` on blur/submit, so per-keystroke state now uses `onInput`
