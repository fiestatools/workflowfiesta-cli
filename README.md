# WorkflowFiesta CLI

A terminal-based chat interface for WorkflowFiesta, built with [@opentui/react](https://opentui.com/).

## Installation

```bash
bun install
```

## Running

```bash
bun dev
```

## Features

### Side Panel
Toggle with `Ctrl+B` to show:
- Conversation info (title, message counts)
- Agent status (name, working/ready state)
- Connection status
- Keyboard shortcuts reference

### Command Palette
Press `/` to open the command palette:
- `/new` - Start a new conversation
- `/clear` - Clear current conversation
- `/retry` - Re-send the last message
- `/copy` - Copy the last reply to the clipboard
- `/agent` - Switch to a different agent
- `/history` - Browse and reopen past conversations
- `/settings` - Open settings panel
- `/panel` - Toggle side panel
- `/help` - Show help and shortcuts
- `/version` - Show version info

Use `↑↓` to navigate, `Tab` to autocomplete, `Enter` to execute, `Esc` to close.

> `/theme` and `/model` are reserved for upcoming features and are currently no-ops.

### Agent Picker
Run `/agent` to switch which agent the current thread runs. The picker lists
your org's agents (with descriptions), highlights the active one, and applies
the selection immediately. `↑↓` to move, `Enter` to select, `Esc` to close.

### Conversation History
Run `/history` to browse threads you've chatted with before. The CLI remembers
conversations locally in `conversations.json` (the `/external` API has no
server-side conversation list), titled from each thread's first message.

- `Enter` on a conversation reopens it — its messages are re-fetched from the
  backend, and further messages continue the same thread.
- `Enter` on **+ New chat** starts a fresh thread.
- `d` forgets a conversation from local history (the backend thread is untouched).
- `↑↓` to move, `Esc` to close.

### Interactive Tool Requests
When an agent run needs something from you mid-run, an inline form takes over the
input until you respond (or press `Esc` to cancel, which cancels the request):

- **Credentials** — the agent's `request_credentials` tool renders a field form.
  The first field is focused on open, so you just type or paste; `Tab` / `↓` /
  `Enter` move to the next field and then to the **Test** / **Submit** / **Cancel**
  actions (`Enter` on an action runs it). Password/secret fields are masked (`•`).
- **MCP server setup** — collects the server URL/name (and optional OAuth client
  credentials). If the server needs browser authorization, a **Connect** action
  opens your browser to finish.
- **OAuth connection** — shows the provider and scopes; **Connect** opens the
  consent page in your browser and the CLI polls until you authorize.
- **Access tokens** — a token the agent mints pops up in a modal with the secret
  **masked** by default. Press `c` (or **Copy**) to copy the full secret without
  displaying it; `r` (or **Reveal**) toggles the plaintext if you need to read it;
  `Enter`/`Esc` dismisses. It's shown only once. (`/copy` copies the last reply.)
- **Runner approvals** — when a self-hosted runner parks a job, a system message
  tells you to approve/reject it in the runner app.

### Clipboard

Copy (the token modal's **Copy**, and `/copy`) works both locally and over SSH.
Locally it uses the native tool (`pbcopy` / `wl-copy` / `xclip` / `xsel` / `clip`);
over an SSH/tmux session it falls back to an **OSC 52** escape sequence so the
text lands on *your* machine's clipboard rather than the remote host's. OSC 52
needs a terminal that supports it (most modern ones do; a few disable it by
default) — if copy ever doesn't stick over SSH, that's the thing to check.

### Settings Panel
Toggle with `Ctrl+S` to configure:
- API Base URL (for self-hosted instances)
- Agent ID
- Request Timeout
- Sign out option

### Multiline Input
- `Enter` to send message
- `Shift+Enter` for newline
- Auto-grows up to 12 lines

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Toggle settings panel |
| `Ctrl+B` | Toggle side panel |
| `Ctrl+N` | Start new chat |
| `Ctrl+C` | Quit |
| `/` | Open command palette |
| `Tab` | Switch fields (in forms) |

## Configuration

Configuration files are stored in `~/.config/workflowfiesta/cli/`:

- `config.json` - User preferences (agent ID, timeout, etc.)
- `credentials.json` - Auth token and API URL override
- `conversations.json` - Local index of past conversations (for `/history`)
- `cli.log` - Debug log file

## Authentication

On first run, you'll be prompted to enter:
1. Your API token
2. API URL (optional, for self-hosted instances)

Use `Tab` to switch between fields, `Enter` to submit.

## Development

This project was created using `bun create tui`. See [create-tui](https://git.new/create-tui) for more info on OpenTUI.
