import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runDoctor } from '../../src/cli/doctor';

const cleanupPaths: string[] = [];

afterEach(() => {
  for (const path of cleanupPaths.splice(0)) {
    rmSync(path, { force: true, recursive: true });
  }
});

describe('runDoctor', () => {
  test('reports missing hook configuration', async () => {
    const projectDir = join(tmpdir(), `codex-safeguard-missing-${Date.now()}`);
    mkdirSync(projectDir, { recursive: true });
    cleanupPaths.push(projectDir);

    const report = await runDoctor({ cwd: projectDir, homeDir: '/tmp/home-for-test' });

    expect(report.ok).toBe(false);
    expect(report.summary).toContain('hooks');
    expect(report.hookConfig.status).toBe('missing');
  });

  test('reports configured hooks and a passing self-test', async () => {
    const projectDir = join(tmpdir(), `codex-safeguard-configured-${Date.now()}`);
    mkdirSync(join(projectDir, '.codex'), { recursive: true });
    writeFileSync(
      join(projectDir, '.codex', 'hooks.json'),
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: 'bunx codex-safeguard pre-tool-use' }],
            },
          ],
          Stop: [{ hooks: [{ type: 'command', command: 'bunx codex-safeguard stop' }] }],
        },
      }),
      'utf-8',
    );
    cleanupPaths.push(projectDir);

    const report = await runDoctor({ cwd: projectDir, homeDir: '/tmp/home-for-test' });

    expect(report.ok).toBe(true);
    expect(report.hookConfig.status).toBe('configured');
    expect(report.selfTest.blocked).toBeGreaterThan(0);
    expect(report.selfTest.failed).toBe(0);
  });

  test('reports invalid hook files that omit safety-net commands', async () => {
    const projectDir = join(tmpdir(), `codex-safeguard-invalid-${Date.now()}`);
    mkdirSync(join(projectDir, '.codex'), { recursive: true });
    writeFileSync(join(projectDir, '.codex', 'hooks.json'), '{"hooks":{}}', 'utf-8');
    cleanupPaths.push(projectDir);

    const report = await runDoctor({ cwd: projectDir, homeDir: '/tmp/home-for-test' });

    expect(report.ok).toBe(false);
    expect(report.hookConfig.status).toBe('invalid');
  });

  test('reports invalid hook files when a configured command target does not exist', async () => {
    const projectDir = join(tmpdir(), `codex-safeguard-missing-target-${Date.now()}`);
    mkdirSync(join(projectDir, '.codex'), { recursive: true });
    writeFileSync(
      join(projectDir, '.codex', 'hooks.json'),
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: 'node /tmp/does-not-exist/codex-safeguard.js pre-tool-use',
                },
              ],
            },
          ],
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'node /tmp/does-not-exist/codex-safeguard.js stop',
                },
              ],
            },
          ],
        },
      }),
      'utf-8',
    );
    cleanupPaths.push(projectDir);

    const report = await runDoctor({ cwd: projectDir, homeDir: '/tmp/home-for-test' });

    expect(report.ok).toBe(false);
    expect(report.hookConfig.status).toBe('invalid');
    expect(report.summary).toContain('invalid');
  });
});
