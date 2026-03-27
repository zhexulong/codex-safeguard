import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const readme = readFileSync(resolve(import.meta.dir, '../../README.md'), 'utf-8');
const gettingStarted = readFileSync(
  resolve(import.meta.dir, '../../docs/getting-started.md'),
  'utf-8',
);
const cleanupPaths: string[] = [];

afterEach(() => {
  for (const path of cleanupPaths.splice(0)) {
    rmSync(path, { force: true, recursive: true });
  }
});

describe('publish readiness', () => {
  test('npm package includes built CLI and hook template but excludes local hooks.json', async () => {
    const tgzPath = resolve(import.meta.dir, '../../codex-safeguard-0.1.0.tgz');
    cleanupPaths.push(tgzPath);

    const packProc = Bun.spawn(['npm', 'pack'], {
      cwd: resolve(import.meta.dir, '../..'),
      env: {
        ...process.env,
        CI: 'true',
      },
      stderr: 'pipe',
      stdout: 'pipe',
    });

    const stdout = await new Response(packProc.stdout).text();
    const exitCode = await packProc.exited;

    expect(exitCode).toBe(0);

    const tgzName = stdout.trim().split('\n').at(-1);
    expect(tgzName).toBe('codex-safeguard-0.1.0.tgz');

    const tarProc = Bun.spawn(['tar', '-tzf', resolve(import.meta.dir, `../../${tgzName ?? ''}`)], {
      cwd: resolve(import.meta.dir, '../..'),
      env: {
        ...process.env,
        CI: 'true',
      },
      stderr: 'pipe',
      stdout: 'pipe',
    });

    const tarStdout = await new Response(tarProc.stdout).text();
    const tarExitCode = await tarProc.exited;

    expect(tarExitCode).toBe(0);

    const paths = tarStdout
      .trim()
      .split('\n')
      .map((path) => path.replace(/^package\//, ''))
      .filter(Boolean);

    expect(paths).toContain('dist/src/cli/codex-safeguard.js');
    expect(paths).toContain('.codex/hooks.template.json');
    expect(paths).not.toContain('.codex/hooks.json');
  }, 15000);

  test('README quick start mentions bunx-based published hook commands', () => {
    expect(readme).toContain('bunx codex-safeguard pre-tool-use');
    expect(readme).toContain('bunx codex-safeguard stop');
    expect(gettingStarted).toContain('bunx codex-safeguard pre-tool-use');
    expect(gettingStarted).toContain('bunx codex-safeguard stop');
    expect(readme).toContain('The published **npm package** is the runtime that your hooks call.');
    expect(readme).toContain('npm 包就是实际运行时');
    expect(readme).toContain('Known bypass paths still exist');
    expect(readme).toContain('目前仍然存在已知绕过路径');
  });
});
