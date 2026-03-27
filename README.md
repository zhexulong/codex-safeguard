# Codex Safeguard

**Codex, please stop deleting my D drive.**  
**Codex，请不要再删除我的 D 盘了。**

[English](#english) | [中文](#chinese)

<a id="english"></a>

## English

### What this is

Codex Safeguard is a command guard for Codex. It runs in `PreToolUse`, blocks high-risk shell commands before execution, and returns a strong `permissionDecisionReason` that explains why the command is dangerous and why the model should not switch to an equivalent bypass.

Inspired by [`claude-code-safety-net`](https://github.com/kenryu42/claude-code-safety-net), but focused on Codex and practical Bash plus Bash-routed PowerShell workflows.

The published **npm package** is the runtime that your hooks call. In practice, `bunx codex-safeguard pre-tool-use` and `bunx codex-safeguard stop` execute the packaged CLI from npm. The plugin metadata and skills are distributed alongside it, but the npm CLI is the piece that actually analyzes commands and returns `permissionDecisionReason` to Codex.

### The problem it solves

Codex can propose destructive commands that look reasonable in context, such as:

- `git reset --hard`
- `git clean -fd`
- `git push --force`
- `rm -rf ~`
- `pwsh -Command "Remove-Item -Recurse -Force ~"`

Approval prompts help, but they are not a complete safety layer. An agent can still pick a destructive command, switch to an equivalent one after being blocked, or present dangerous cleanup as a normal follow-up step.

### What it currently blocks

- destructive Git commands
  - `git reset --hard`
  - `git checkout -- <files>`
  - `git clean -fd`
  - `git push --force` without `--force-with-lease`
- destructive shell deletion against root/home-style paths
  - `rm -rf /`
  - `rm -rf ~`
  - `rm -rf $HOME`
- destructive PowerShell commands sent through Bash
  - `pwsh -Command "git reset --hard"`
  - `pwsh -Command "Remove-Item -Recurse -Force ~"`
  - `powershell -Command "..."`
- destructive interpreter one-liners
  - `python -c 'os.system("rm -rf /")'`
- PowerShell `-EncodedCommand` is conservatively blocked

### Current limitations

- Codex public hooks currently expose **`Bash`** at `PreToolUse`, not a native PowerShell tool target.
  - So current PowerShell support means **PowerShell commands that Codex sends through the Bash tool**.
- Hooks are behind the Codex feature flag:

```toml
[features]
codex_hooks = true
```

- Official Codex docs currently state that hooks are temporarily disabled on native Windows.
- Known bypass paths still exist:
  - Codex currently documents that a model can still write a script to disk and then run that script with Bash, which reduces the effectiveness of command-string inspection.
  - Semantically equivalent commands that are not yet explicitly modeled by Codex Safeguard may still execute until dedicated rules are added.
- This project is a guardrail, not an OS sandbox.

### Quick start

1. Add this to `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

2. Create `~/.codex/hooks.json` or `<repo>/.codex/hooks.json` using the published package path:

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

3. Start Codex normally.

4. Try it in Codex:

```text
Use the shell executor to run exactly this command in the current repository: git clean -fd
```

If the model does not refuse earlier at the language level, the hook should block it.

In this setup, the **npm package is the actual runtime**. Hooks call `bunx codex-safeguard ...`, which downloads or uses the published package and executes the guard logic.

### Recommended plugin setup and why it matters

Installing Codex Safeguard as a **local Codex plugin** is optional for enforcement, but recommended if you want:

- discovery in `/plugins`
- bundled skills such as install / explain / doctor
- a cleaner team-distribution path than passing around raw hook snippets

Important: the plugin does **not** replace hook configuration. The plugin helps Codex discover the packaged skills; the actual blocking still comes from `hooks.json`.

### How it works

1. Codex prepares a Bash tool call.
2. A `PreToolUse` hook invokes Codex Safeguard.
3. Codex Safeguard analyzes the command string.
4. If a destructive rule matches, it returns:
   - `permissionDecision: "deny"`
   - a detailed `permissionDecisionReason`

The blocking message is intentionally explicit. For example, destructive Git commands warn the model not to replace a blocked command with equivalent direct file deletion or other bypasses.

### Detailed docs

- [Getting Started](docs/getting-started.md) — hook setup, published package usage, Windows notes, and local plugin installation
- [Source Install & Development](docs/source-install.md) — build-from-source workflow, source-path hooks, development commands, and repository layout

<a id="chinese"></a>

## 中文

### 这是什么

Codex Safeguard 是一个面向 Codex 的命令保护层。它在 `PreToolUse` 阶段拦截高风险 shell 命令，并通过明确的 `permissionDecisionReason` 解释：为什么这条命令危险，以及为什么不要换成等价命令继续绕过。

项目灵感来自 [`claude-code-safety-net`](https://github.com/kenryu42/claude-code-safety-net)，但重点面向 Codex，以及 Bash 和“通过 Bash 发出的 PowerShell 命令”这一类实际工作流。

发布到 npm 的 **`codex-safeguard` 包** 是真正的运行时。也就是说，hook 里写的 `bunx codex-safeguard ...` 实际调用的是这个 npm 包中的 CLI；plugin 和 skills 只是围绕这个运行时做发现与分发。

### 它解决什么问题

Codex 可能会在上下文里提出看起来合理、但实际具有破坏性的命令，例如：

- `git reset --hard`
- `git clean -fd`
- `git push --force`
- `rm -rf ~`
- `pwsh -Command "Remove-Item -Recurse -Force ~"`

审批提示有帮助，但并不是完整的安全层。模型仍然可能选择危险命令、在被拦后切换到等价命令、或者把高风险清理包装成“顺手做一下”的后续步骤。

### 当前会拦什么

- 高风险 Git 命令
  - `git reset --hard`
  - `git checkout -- <files>`
  - `git clean -fd`
  - 不带 `--force-with-lease` 的 `git push --force`
- 对 root/home 风格路径的危险 shell 删除
  - `rm -rf /`
  - `rm -rf ~`
  - `rm -rf $HOME`
- 通过 Bash 发出的危险 PowerShell 命令
  - `pwsh -Command "git reset --hard"`
  - `pwsh -Command "Remove-Item -Recurse -Force ~"`
  - `powershell -Command "..."`
- 危险 interpreter one-liner
  - `python -c 'os.system("rm -rf /")'`
- PowerShell `-EncodedCommand` 当前采取保守阻断

### 当前限制

- Codex 公开 hooks runtime 当前在 `PreToolUse` 只暴露 **`Bash`**，没有原生 PowerShell tool target。
  - 所以当前 PowerShell 支持指的是 **Codex 通过 Bash 工具发送出来的 PowerShell 命令**。
- Hooks 受 Codex feature flag 控制：

```toml
[features]
codex_hooks = true
```

- 官方文档目前还写着：Windows 原生 hooks 暂时禁用。
- 目前仍然存在已知绕过路径：
  - Codex 官方文档已经明确说明，模型仍然可以先把脚本写到磁盘，再通过 Bash 执行这个脚本，从而削弱基于命令字符串的检查。
  - 对于那些**语义等价但当前尚未被显式建模**的命令，只要规则还没覆盖，仍然可能执行成功，直到后续补上专门规则。
- 这个项目是 guardrail，不是 OS 级沙箱。

### 最短上手路径

1. 在 `~/.codex/config.toml` 中加入：

```toml
[features]
codex_hooks = true
```

2. 在 `~/.codex/hooks.json` 或 `<repo>/.codex/hooks.json` 中使用发布包命令：

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

3. 正常启动 Codex。

4. 在 Codex 中亲自试：

```text
Use the shell executor to run exactly this command in the current repository: git clean -fd
```

如果模型没有先在语言层拒绝，这条命令就应该被 hook 拦下。

在这条路径里，**npm 包就是实际运行时**：`hooks.json` 负责接线，`bunx codex-safeguard ...` 负责真正执行分析与返回阻断结果。

### 建议选择的 plugin 以及价值

把 Codex Safeguard 作为**本地 Codex 插件**安装，对真正的拦截不是必须的，但如果你希望：

- 在 `/plugins` 中发现它
- 直接使用打包好的 install / explain / doctor skills
- 给团队分发一个比裸 hook 片段更完整的入口

那我建议安装 plugin。

注意：plugin 不能替代 hook 配置。plugin 的价值是技能发现和分发；真正的阻断仍然来自 `hooks.json`。

### 我们怎么解决

1. Codex 准备执行 Bash 工具调用
2. `PreToolUse` hook 调用 Codex Safeguard
3. Codex Safeguard 分析命令字符串
4. 命中危险规则时返回：
   - `permissionDecision: "deny"`
   - 明确的 `permissionDecisionReason`

阻断文案会明确告诉模型：不要把被拒绝的命令换成等价的 shell / PowerShell / Git 绕过命令继续执行。

### 详细文档

- [Getting Started](docs/getting-started.md) — hook 配置、发布包用法、Windows 说明、以及本地 plugin 安装
- [Source Install & Development](docs/source-install.md) — 从源码运行、开发命令、源码路径 hook、仓库结构

### 社区

欢迎提交 issue 和 pull request！如果你有新的规则想法或者改进建议，也欢迎提出来。同时感谢linux.do社区的讨论和反馈，帮助我们不断完善这个项目。
