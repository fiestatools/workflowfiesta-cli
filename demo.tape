# WorkflowFiesta CLI Demo
# Run: vhs demo.tape

Output assets/demo.gif

Set FontSize 16
Set Width 1200
Set Height 700
Set Theme "Catppuccin Mocha"
Set Padding 20

# Start the CLI
Type "./dist/workflowfiesta-darwin-arm64/bin/wf"
Enter
Sleep 3s

# Send a message
Type "Hello! Can you help me set up a GitHub webhook integration?"
Sleep 500ms
Enter
Sleep 4s

# Open command palette
Type "/"
Sleep 1s

# Show agent picker
Type "agent"
Enter
Sleep 2s

# Navigate agents
Down
Sleep 500ms
Down
Sleep 500ms
Up
Sleep 500ms
Escape
Sleep 1s

# Show history
Type "/"
Sleep 500ms
Type "history"
Enter
Sleep 2s
Escape
Sleep 1s

# Toggle side panel
Ctrl+B
Sleep 2s
Ctrl+B
Sleep 1s

# End
Sleep 2s
