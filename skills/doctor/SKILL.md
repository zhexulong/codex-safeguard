---
name: doctor
description: Run Codex Safeguard diagnostics to verify hooks, self-tests, and recent activity for the current repository.
---

Run the Codex Safeguard doctor workflow.

Steps:
1. Execute `bunx codex-safeguard doctor` from the current repository.
2. Read the summary carefully.
3. If hooks are missing, explain how to install `.codex/hooks.template.json` as `.codex/hooks.json`.
4. If self-tests fail, show the failing counts and recommend rerunning `bun test` in this plugin repository.
5. If recent activity exists, mention how many session log files were detected.
