---
"@workflowfiesta/cli": minor
---

Sync custom commands with your org and run them as agent sessions

- Custom commands created in the web app now appear in the palette under Custom. They load on startup and refresh when you open the palette, and a local cache keyed by org means they show instantly and still work when the backend is unreachable
- Running one starts a command session: the thread switches to the command's agent, the header shows which command is active, and `/exit-command` restores the agent you were on. Sessions also end on `/new` or when you open another conversation
- Commands with a prompt template seed the input when they start. `{{args}}` is replaced with whatever you typed after the command, and arguments are appended when the template has no placeholder
- Commands in `.workflowfiesta/commands/*.json` now load correctly. They were read into an empty list before and never reached the palette. They also accept `agentId`, `promptTemplate`, `icon`, and `displayName`, so a file-defined command runs the same as one from the web app
- Local commands are published to your org on the next sync, so a command you define in a file becomes available to your team and shows up in the web app. Publishing only ever creates: a name already taken in the org is left untouched, deleting a local file leaves the org command in place, and a command deleted in the web app is not recreated from a local file
- Definitions from the web app win over local files of the same name, and neither can shadow a built-in, so `/new` and `/help` always do what they say
- `/refresh-commands` reloads the list immediately instead of waiting for the next refresh

Requires a backend that serves `GET` and `POST /external/custom-commands`.
