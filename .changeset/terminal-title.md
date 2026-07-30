---
"@workflowfiesta/cli": minor
---

Set the terminal window/tab title to the active conversation

- The title follows the active conversation as `WF - <conversation title>`, so multiple `wf` tabs are easy to tell apart. A chat with no title yet shows a bare `WF`, and the title is cleared again when the CLI exits
- Pass `--title <title>` to pin a fixed title for the session instead of following the conversation
- Turn it off from the Settings panel (**Terminal title**), the `terminalTitle` config key, or the `WORKFLOWFIESTA_DISABLE_TERMINAL_TITLE` env var — the config key takes precedence over the env var
- Titles are set with an OSC escape sequence, wrapped in tmux's passthrough when running inside tmux
