---
"@workflowfiesta/cli": patch
---

Fix the slash command palette hiding matches and not scrolling

- The palette was one row shorter than its contents, so the last row was clipped — typing `/his` showed the "Navigation" heading with no `/history` under it. Narrow matches now render in full
- Arrowing past the last visible row scrolls the list to follow the selection, instead of moving the highlight out of sight
- Custom commands from config now appear on a bare `/`, which previously listed built-in commands only
- Selection follows the grouped order shown on screen, so the highlighted command is always the one that runs
