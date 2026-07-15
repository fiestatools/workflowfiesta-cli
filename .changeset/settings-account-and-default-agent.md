---
"@workflowfiesta/cli": minor
---

Add account info and a default-agent picker to the settings panel

- The Account section now shows who you're signed in as (email), your organization name, and the access token in use with its expiry. Org name and user require a recent backend; the panel falls back to the org ID on older servers
- The raw "Agent ID" text field is replaced with a **Default agent** picker: choose a specific agent to pin it as this CLI's default for new conversations, or "Use account default" to follow the account default set in the web app. Changing it takes effect immediately without a restart. This is distinct from `/agent`, which switches only the current conversation.
