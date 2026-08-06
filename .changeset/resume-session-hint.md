---
"@workflowfiesta/cli": minor
---

Show how to resume the conversation on exit, and reopen one with `wf -s <id>`

- Quitting the chat now prints the conversation you were on and the command that reopens it, so an exited session isn't lost to whatever the terminal scrolled away. Nothing is printed when there is no thread to resume — a session that never sent a message, or one reset with `/new`
- `wf -s <id>` reopens a specific conversation, alongside the existing `wf -c` for the most recent one. The two are mutually exclusive. Messages are loaded from the backend, so any conversation UID works, not only ones this machine has seen
- Root options now bind only before a subcommand name, so the new root `-s` can't shadow `wf run -s <id>`
- Seed the terminal's cursor-save slot before the renderer starts. The TUI probes the terminal by homing the cursor, which left the alternate screen restoring to the top-left on exit — the shell prompt and the exit banner then painted over the scrollback
