import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runCli } from '../../src/cli/codex-safeguard';

const cleanupPaths: string[] = [];

afterEach(() => {
  for (const path of cleanupPaths.splice(0)) {
    rmSync(path, { force: true, recursive: true });
  }
});

describe('runCli', () => {
  test('prints an explanation for explain mode', async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli(['explain', 'git reset --hard'], {
      cwd: '/repo',
      stderr: (line: string) => stderr.push(line),
      stdout: (line: string) => stdout.push(line),
    });

    expect(exitCode).toBe(0);
    expect(stderr).toHaveLength(0);
    expect(stdout.join('\n')).toContain('git reset --hard');
  });

  test('returns non-zero when doctor detects missing hooks', async () => {
    const projectDir = join(tmpdir(), `codex-safeguard-cli-${Date.now()}`);
    mkdirSync(projectDir, { recursive: true });
    cleanupPaths.push(projectDir);

    const stdout: string[] = [];

    const exitCode = await runCli(['doctor'], {
      cwd: projectDir,
      homeDir: '/tmp/home-for-test',
      stderr: () => undefined,
      stdout: (line: string) => stdout.push(line),
    });

    expect(exitCode).toBe(1);
    expect(stdout.join('\n')).toContain('hooks');
  });

  test('fails open on malformed hook JSON input', async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli(['pre-tool-use'], {
      cwd: '/repo',
      readStdin: async () => '{not-json',
      stderr: (line: string) => stderr.push(line),
      stdout: (line: string) => stdout.push(line),
    });

    expect(exitCode).toBe(0);
    expect(stdout).toHaveLength(0);
    expect(stderr).toHaveLength(0);
  });

  test('emits a deny hook payload for a dangerous powershell command via pre-tool-use CLI mode', async () => {
    const stdout: string[] = [];

    const exitCode = await runCli(['pre-tool-use'], {
      cwd: '/repo',
      readStdin: async () =>
        JSON.stringify({
          cwd: '/repo',
          hook_event_name: 'PreToolUse',
          session_id: 'session-1',
          tool_input: {
            command: 'pwsh -Command "git reset --hard"',
          },
          tool_name: 'Bash',
        }),
      stderr: () => undefined,
      stdout: (line: string) => stdout.push(line),
    });

    const payload = JSON.parse(stdout[0] ?? '{}') as {
      hookSpecificOutput?: {
        permissionDecision?: string;
        permissionDecisionReason?: string;
      };
    };

    expect(exitCode).toBe(0);
    expect(payload.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(payload.hookSpecificOutput?.permissionDecisionReason).toContain(
      'pwsh -Command "git reset --hard"',
    );
  });
});
