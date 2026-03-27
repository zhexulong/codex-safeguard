# Source Install & Development

This guide is for contributors or users who want to run Codex Safeguard directly from a local checkout rather than from the published npm package.

## 1. Install dependencies

```bash
bun install
```

## 2. Build the project

```bash
bun run build
```

## 3. Use source-path hooks for local development

For a live checkout, it is safer to point hook commands at the source entrypoint instead of `dist/`, because local development workflows often clean the build output.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bun /absolute/path/to/codex-safeguard/src/cli/codex-safeguard.ts pre-tool-use",
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
            "command": "bun /absolute/path/to/codex-safeguard/src/cli/codex-safeguard.ts stop",
            "statusMessage": "Codex Safeguard: checking completion"
          }
        ]
      }
    ]
  }
}
```

## 4. Manual development checks

Explain a blocked command from source:

```bash
bun src/cli/codex-safeguard.ts explain "git clean -fd"
bun src/cli/codex-safeguard.ts explain 'pwsh -Command "git reset --hard"'
```

Simulate a real `PreToolUse` payload:

```bash
printf '%s' '{"cwd":"/path/to/repo","hook_event_name":"PreToolUse","session_id":"session-1","tool_input":{"command":"git clean -fd"},"tool_name":"Bash"}' \
  | bun src/cli/codex-safeguard.ts pre-tool-use
```

## 5. Development verification

```bash
bun run check
```

## 6. Repository layout

- `.codex-plugin/plugin.json` — Codex plugin manifest
- `.codex/hooks.template.json` — published hook template
- `skills/` — bundled skills
- `src/` — implementation
- `tests/` — automated tests
