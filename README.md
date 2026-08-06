<p align="center">
  <img src="assets/logo.svg" alt="WorkflowFiesta logo" width="200">
</p>

<p align="center">AI-powered workflow automation in your terminal.</p>

<p align="center">
  <a href="https://github.com/fiestatools/workflowfiesta-cli/releases"><img alt="GitHub release" src="https://img.shields.io/github/v/release/fiestatools/workflowfiesta-cli?style=flat-square" /></a>
  <a href="https://github.com/fiestatools/workflowfiesta-cli/actions/workflows/release.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/fiestatools/workflowfiesta-cli/release.yml?style=flat-square&branch=main" /></a>
</p>

<p align="center">
  <img src="assets/demo.gif" alt="WorkflowFiesta CLI demo" width="800">
</p>

---

## Installation

```bash
# Quick install (macOS and Linux)
curl -fsSL https://workflowfiesta.com/install-cli | bash

# Homebrew (macOS and Linux)
brew install fiestatools/tap/workflowfiesta

# Direct download (macOS, Linux, Windows)
# Download from https://github.com/fiestatools/workflowfiesta-cli/releases
```

## Quick Start

```bash
# Start the CLI
wf

# Or use the full name
workflowfiesta

# Pick up where you left off
wf --continue

# Reopen a specific conversation
wf -s <conversation-id>
```

On first run, you'll be prompted to authenticate with your API token.

## Features

### Command Palette

Press `/` to open the command palette:

| Command | Description |
|---------|-------------|
| `/new` | Start a new conversation |
| `/agent` | Switch to a different agent |
| `/rename <new title>` | Rename the current conversation |
| `/history` | Browse past conversations |
| `/settings` | Open settings panel |
| `/copy` | Copy the last reply |
| `/help` | Show help and shortcuts |

### Agent Picker

Run `/agent` to switch agents for the current conversation. The picker shows your org's available agents with descriptions.

### Settings

Run `/settings` (or `Ctrl+S`) to open the settings panel. It shows:

- **Account** — who you're signed in as, your organization, and the access token in use with its expiry
- **Configuration** — API base URL and request timeout
- **Terminal title** — toggle whether the terminal window/tab title follows the conversation title (see below)
- **Default agent** — the agent new conversations start with. Choose a specific agent to pin it for this CLI, or "Use account default" to follow whatever your account sets in the web app. This is separate from `/agent`, which only switches the current conversation.

### Terminal Title

The CLI sets your terminal window/tab title to `WF - <conversation title>`, so multiple `wf` tabs are easy to tell apart. A chat with no title yet shows just `WF`, and the title is cleared again when the CLI exits.

- Pass `--title <title>` to set a fixed title for the session instead of following the conversation. The `WF - ` prefix still applies.
- Disable it with the `WORKFLOWFIESTA_DISABLE_TERMINAL_TITLE` env var, or the `terminalTitle` config key (which takes precedence over the env var). The Settings panel toggles the config key.

### Resuming Conversations

On exit (`Ctrl+C`), the CLI prints the conversation you were on and the command that reopens it:

```
  WorkflowFiesta

  Session   Docker Compose can't resolve 'db' address
  Continue  wf -s 018f3c2a-7b19-4d6e-9c11-2a5f8e0b4d33
```

| Command | Description |
|---------|-------------|
| `wf -s <id>` | Reopen that conversation |
| `wf -c` | Reopen the most recent conversation |

The two flags are mutually exclusive. `wf run` takes the same flags for non-interactive use. Nothing is printed on exit if the session never started a conversation, or if it was reset with `/new`.

### Conversation History

Run `/history` to browse and manage previous conversations. Conversations are stored locally and synced with the backend.

| Key | Action |
|-----|--------|
| `Enter` | Reopen the selected conversation |
| `r` | Rename the selected conversation |
| `Space` | Mark/unmark for bulk delete |
| `d` | Delete the selected (or marked) conversations, with confirmation |

### Interactive Tool Requests

The CLI handles mid-run agent requests inline:
- **Credentials** - Secure form for entering secrets
- **OAuth** - Browser-based authorization flow
- **MCP servers** - Server configuration and connection

### Platform Guard Notices

Verdicts from the platform's guard agents render as distinct bubbles, matching the web app:
- **Auth Cop** - Security reviews with their decision (approved / awaiting confirmation / declined)
- **Secret Safe** - Redaction notices when secrets are detected
- **Helping Hand** - Suggestions when a run needs a nudge

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Open command palette |
| `Ctrl+B` | Toggle side panel |
| `Ctrl+S` | Toggle settings |
| `Ctrl+N` | New conversation |
| `Shift+Enter` | Newline in input |
| `Enter` | Send message |
| `Ctrl+C` | Quit (prints how to resume the conversation) |

## Configuration

Config files are stored in `~/.config/workflowfiesta/cli/`:

| File | Purpose |
|------|---------|
| `config.json` | User preferences |
| `credentials.json` | Auth token and API URL |
| `conversations.json` | Local conversation index |

## Development

```bash
# Install dependencies
bun install

# Run in dev mode
bun dev

# Build all platforms
bun run build
```

---

**WorkflowFiesta** | [Website](https://workflowfiesta.com) | [Documentation](https://testfiesta.gitbook.io/workflowfiesta)
