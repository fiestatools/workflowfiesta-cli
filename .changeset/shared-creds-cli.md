---
"@workflowfiesta/cli": minor
---

Share sign-in with the VS Code extension. On macOS, credentials now live in the Keychain (item `WorkflowFiesta-credentials`) and an existing `credentials.json` is moved there automatically; Linux and Windows keep using `credentials.json`, now written atomically. A failed `wf auth login` no longer changes or removes the current session, and `wf auth logout` no longer clears the next account's API URL.
