# Codex Safeguard

**Codex, please stop deleting my D drive.**  
**Codex，请不要再删除我的 D 盘了。**

[English](#english) | [中文](#chinese)

<a id="english"></a>

## English

Codex Safeguard is a small command guard for Codex. It blocks high-risk shell commands before execution and returns a strong `permissionDecisionReason` that explains **why** the command is dangerous and **why the model should not switch to an equivalent bypass command**.

Inspired by [`claude-code-safety-net`](https://github.com/kenryu42/claude-code-safety-net), but focused on **Codex** and on practical setup for **Bash plus PowerShell-via-Bash** workflows.

### The problem it solves

Codex can propose commands like:

- `git reset --hard`
- `git clean -fd`
- `git push --force`
- `rm -rf ~`
- `pwsh -Command "Remove-Item -Recurse -Force ~"`

Approval prompts help, but they are not a complete safety mechanism. In practice, an agent can still:

- choose a destructive command that looks more specific
- switch to an equivalent command after one command is blocked
- present a dangerous cleanup as a reasonable follow-up step

Codex Safeguard adds a **PreToolUse hook layer** so these commands can be denied before the tool actually runs.

### How it works

1. Codex prepares to run a **Bash** tool call.
2. A `PreToolUse` hook sends the command to Codex Safeguard.
3. Safeguard analyzes the command string.
4. If the command matches a destructive rule, it returns:
   - `permissionDecision: "deny"`
   - a detailed `permissionDecisionReason`

The blocking message is intentionally explicit. For example, destructive Git commands now warn the model **not to replace the blocked command with direct file deletion or other equivalent bypasses**.

### What it currently blocks

- destructive Git commands:
  - `git reset --hard`
  - `git checkout -- <files>`
  - `git clean -fd`
  - `git push --force` without `--force-with-lease`
- destructive shell deletion against root/home paths:
  - `rm -rf /`
  - `rm -rf ~`
  - `rm -rf $HOME`
- destructive PowerShell commands sent through Bash:
  - `pwsh -Command "git reset --hard"`
  - `pwsh -Command "Remove-Item -Recurse -Force ~"`
  - `powershell -Command "..."`
- destructive interpreter one-liners such as:
  - `python -c 'os.system("rm -rf /")'`
- PowerShell `-EncodedCommand` is conservatively blocked

### Current limitations

- The public Codex hooks runtime currently exposes **`Bash`** at `PreToolUse`, not a native PowerShell tool target.
  - So PowerShell support currently means **PowerShell commands that Codex sends through the Bash tool**, such as `pwsh -Command ...`.

- Hooks are behind the Codex feature flag:

```bash
[features]
codex_hooks = true
```

- Official Codex docs currently state that hooks are **temporarily disabled on native Windows**.
- This project is a **guardrail**, not an OS sandbox.

### Quick start

The fastest way to try it is **without** plugin installation first: wire the hook directly into a repository.

#### 1. Build this repository

```bash
bun install
bun run build
```

#### 2. Launch Codex with hooks enabled

Add this to `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

Then launch Codex normally.

#### 3. Install repo-local hooks in the repository you want to protect

Create `.codex/hooks.json` in the target repository.

On Windows PowerShell, copying the template looks like this:

```powershell
Copy-Item .codex/hooks.template.json .codex/hooks.json
```

Use the **source entrypoint** for a live local checkout. This is more stable than pointing at `dist/`, because local development workflows often clean the build output.

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

If you want the same protection across all repositories, install the same hook config at:

```text
~/.codex/hooks.json
```

#### 4. Try it manually

Explain a blocked command:

```bash
bun src/cli/codex-safeguard.ts explain "git clean -fd"
bun src/cli/codex-safeguard.ts explain 'pwsh -Command "git reset --hard"'
```

Simulate a real `PreToolUse` hook payload:

```bash
printf '%s' '{"cwd":"/path/to/repo","hook_event_name":"PreToolUse","session_id":"session-1","tool_input":{"command":"git clean -fd"},"tool_name":"Bash"}' \
  | bun src/cli/codex-safeguard.ts pre-tool-use
```

#### 5. Try it from Codex itself

In a test repository, ask Codex to run:

```text
Use the shell executor to run exactly this command in the current repository: git clean -fd
```

If the model does not refuse earlier at the language level, the hook should block it.

### Optional: install it as a local Codex plugin

Installing the plugin makes the bundled skills discoverable in `/plugins`, but **the actual enforcement still comes from hook files**.

Personal marketplace example:

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

Then start Codex and open:

```text
/plugins
```

### Commands

```bash
bunx codex-safeguard explain "git reset --hard"
bunx codex-safeguard explain 'pwsh -Command "git reset --hard"'
bunx codex-safeguard doctor
```

### Development

```bash
bun install
bun run check
```

### Repository layout

- `.codex-plugin/plugin.json` — Codex plugin manifest
- `.codex/hooks.template.json` — hook template
- `skills/` — bundled skills
- `src/` — implementation
- `tests/` — automated tests

<a id="chinese"></a>

## 中文

Codex Safeguard 是一个面向 Codex 的命令保护层。它会在 Codex 真正执行 shell 命令之前进行分析，并通过 `permissionDecisionReason` 明确说明：**为什么这条命令危险，以及为什么不要换成等价命令继续绕过。**

项目灵感来自 [`claude-code-safety-net`](https://github.com/kenryu42/claude-code-safety-net)，但重点面向 **Codex**，并补上 **PowerShell 通过 Bash 路径执行** 这一类场景的保护。

### 它解决什么问题

Codex 可能会提出并执行类似下面的命令：

- `git reset --hard`
- `git clean -fd`
- `git push --force`
- `rm -rf ~`
- `pwsh -Command "Remove-Item -Recurse -Force ~"`

审批提示有帮助，但并不能构成完整的安全层。实际使用里，模型还可能：

- 改选另一条看起来更“具体”的危险命令
- 被拦后换成等价命令继续做
- 把危险清理包装成“合理的后续步骤”

Codex Safeguard 通过 **PreToolUse hook** 在工具真正运行前拒绝这些命令。

### 我们怎么解决

1. Codex 准备执行 **Bash** 工具调用
2. `PreToolUse` hook 把命令交给 Codex Safeguard
3. Safeguard 分析命令字符串
4. 命中高风险规则时返回：
   - `permissionDecision: "deny"`
   - 明确的 `permissionDecisionReason`

我们现在会在阻断文案里明确告诉模型：

- 不要把被拦的命令换成等价的绕过命令
- 比如不要把 `git clean -fd` 换成 `rm -f` / `Remove-Item`

### 当前会拦什么

- 高风险 Git 命令：
  - `git reset --hard`
  - `git checkout -- <files>`
  - `git clean -fd`
  - `git push --force`（不带 `--force-with-lease`）
- 对 root/home 路径的危险 shell 删除：
  - `rm -rf /`
  - `rm -rf ~`
  - `rm -rf $HOME`
- 通过 Bash 发送出来的危险 PowerShell 命令：
  - `pwsh -Command "git reset --hard"`
  - `pwsh -Command "Remove-Item -Recurse -Force ~"`
  - `powershell -Command "..."`
- 危险 interpreter one-liner：
  - `python -c 'os.system("rm -rf /")'`
- PowerShell `-EncodedCommand` 当前采取保守阻断

### 当前限制

- Codex 公开 hooks runtime 当前在 `PreToolUse` 只暴露 **`Bash`**，没有原生 PowerShell tool target。
  - 所以当前所谓 PowerShell 支持，指的是 **Codex 通过 Bash 工具发送出来的 PowerShell 命令**。

- Hooks 受 Codex feature flag 控制：

```toml
[features]
codex_hooks = true
```

- 官方文档目前还写着：**Windows 原生 hooks 暂时禁用**。
- 这个项目是 guardrail，不是 OS 级沙箱。

### 快速开始

最简单的体验方式不是先装插件，而是**直接把 hook 接到目标仓库**。

#### 1. 先构建本仓库

```bash
bun install
bun run build
```

#### 2. 用启用 hooks 的方式启动 Codex

先在 `~/.codex/config.toml` 里加入：

```toml
[features]
codex_hooks = true
```

然后正常启动 Codex。

#### 3. 在目标仓库安装 repo-local hooks

在目标仓库创建 `.codex/hooks.json`。

如果你在 Windows PowerShell 下复制模板，可以这样做：

```powershell
Copy-Item .codex/hooks.template.json .codex/hooks.json
```

对于本地源码 checkout，推荐直接指向源码入口，而不是 `dist/`，因为开发过程中经常会清理构建产物：

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

如果你想让所有仓库默认受保护，也可以装到：

```text
~/.codex/hooks.json
```

#### 4. 先手动体验

```bash
bun src/cli/codex-safeguard.ts explain "git clean -fd"
bun src/cli/codex-safeguard.ts explain 'pwsh -Command "git reset --hard"'
```

直接模拟 `PreToolUse` 输入：

```bash
printf '%s' '{"cwd":"/path/to/repo","hook_event_name":"PreToolUse","session_id":"session-1","tool_input":{"command":"git clean -fd"},"tool_name":"Bash"}' \
  | bun src/cli/codex-safeguard.ts pre-tool-use
```

#### 5. 从 Codex 里亲自试

在测试仓库里让 Codex 执行：

```text
Use the shell executor to run exactly this command in the current repository: git clean -fd
```

如果模型没有先在语言层拒绝，hook 就应该把它拦下。

### 可选：作为本地 Codex 插件安装

插件安装的作用是让 `/plugins` 里能发现它的 skills，**真正的阻断仍然来自 hook 文件**。

个人 marketplace 示例：

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

然后在 Codex 中打开：

```text
/plugins
```

### 常用命令

```bash
bunx codex-safeguard explain "git reset --hard"
bunx codex-safeguard explain 'pwsh -Command "git reset --hard"'
bunx codex-safeguard doctor
```

### 本地开发

```bash
bun install
bun run check
```

### 仓库结构

- `.codex-plugin/plugin.json` — Codex 插件清单
- `.codex/hooks.template.json` — hook 模板
- `skills/` — 内置技能
- `src/` — 实现代码
- `tests/` — 自动化测试

### 社区

欢迎提交 issue 和 pull request！如果你有新的规则想法或者改进建议，也欢迎提出来。同时感谢linux.do社区的讨论和反馈，帮助我们不断完善这个项目。