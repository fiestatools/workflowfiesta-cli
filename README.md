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

Run `/agent` to switch agents. The picker shows your org's available agents with descriptions.

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
| `Ctrl+C` | Quit |

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
