---
name: explain-block
description: Explain whether a shell command would be blocked by Codex Safeguard and why.
---

Explain a command using Codex Safeguard.

Steps:
1. Run `bunx codex-safeguard explain <command>`.
2. If the command is blocked, report the matched rule and the reason.
3. If the command is allowed, say that no blocking rule matched.
4. Suggest a safer alternative when the command is destructive.
