# Getting Started

This guide covers the practical setup path for using the published `codex-safeguard` package with Codex hooks.

## 1. Enable hooks in Codex

Add this to `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

## 2. Install hook configuration

Codex discovers hooks from:

- `~/.codex/hooks.json`
- `<repo>/.codex/hooks.json`

Use the published package path for both global and repo-local installation:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bunx codex-safeguard pre-tool-use",
            "statusMessage": "Codex Safeguard: checking shell command"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bunx codex-safeguard stop",
            "statusMessage": "Codex Safeguard: checking completion"
          }
        ]
      }
    ]
  }
}
```

## 3. Windows note

If you are copying a template file from PowerShell, use:

```powershell
Copy-Item .codex/hooks.template.json .codex/hooks.json
```

Official Codex docs currently state that hooks are temporarily disabled on native Windows.

## 4. Try it in Codex

Start Codex normally, then ask it to run a blocked command:

```text
Use the shell executor to run exactly this command in the current repository: git clean -fd
```

If the model does not refuse earlier at the language level, Codex Safeguard should block the command through `PreToolUse`.

## 5. Optional: install as a local Codex plugin

Plugin installation is optional for enforcement, but useful for `/plugins` discovery and bundled skills.

Codex official docs describe local plugin installation through a marketplace file. For a personal marketplace, place your plugin under `~/.codex/plugins/` and create `~/.agents/plugins/marketplace.json`.

Example:

```json
{
  "name": "personal-local",
  "interface": {
    "displayName": "Personal Local Plugins"
  },
  "plugins": [
    {
      "name": "codex-safeguard",
      "source": {
        "source": "local",
        "path": "/absolute/path/to/codex-safeguard"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Security"
    }
  ]
}
```

Then open Codex and run:

```text
/plugins
```

Remember: the plugin helps with skill discovery. The actual command blocking still comes from `hooks.json`.

## 6. Common published-package commands

```bash
bunx codex-safeguard explain "git reset --hard"
bunx codex-safeguard explain 'pwsh -Command "git reset --hard"'
bunx codex-safeguard doctor
```
