---
name: install-safeguard
description: Install Codex Safeguard in the current repository by wiring the plugin, copying the hook template, and verifying doctor output.
---

Install Codex Safeguard for the current repository.

Steps:
1. Verify the repository has a `.codex/` directory. Create it if missing.
2. Copy `.codex/hooks.template.json` from this plugin to `.codex/hooks.json` in the target repository unless a custom hooks file already exists.
3. If a hooks file already exists, merge the `PreToolUse` and `Stop` entries instead of overwriting unrelated hooks.
4. Run `bunx codex-safeguard doctor` from the target repository.
5. Summarize whether hooks are configured and whether the self-test passed.

Do not silently delete or overwrite existing hook definitions.
