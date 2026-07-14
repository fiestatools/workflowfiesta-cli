---
"@workflowfiesta/cli": patch
---

Fix modal/dialog focus trapping where up/down arrow keys would cycle through prompt history instead of navigating within the dialog. Also fix Windows CI CodeSignTool extraction to handle zip files that extract contents directly rather than into a subdirectory.
