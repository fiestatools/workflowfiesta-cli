---
"@workflowfiesta/cli": minor
---

Render guard-agent verdicts (Auth Cop, Secret Safe, Helping Hand) as distinct bubbles

- Auth Cop security reviews show with their decision badge (approved / awaiting confirmation / declined), a waiting notice when the agent needs your reply, and an escalation hint when declined
- Secret Safe redaction notices and Helping Hand suggestions render with their own headers and accent colors, matching the web app
- Previously these messages were appended into the assistant's reply text (or lost entirely once the run finished); the run stream now stays open after completion so post-run verdicts arrive, and they are excluded from reply reconciliation
- Reopened conversations render stored guard verdicts the same way
