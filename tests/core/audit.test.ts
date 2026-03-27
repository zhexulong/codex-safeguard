import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getDefaultLogDir, writeAuditLog } from '../../src/core/audit';

const cleanupPaths: string[] = [];

afterEach(() => {
  for (const path of cleanupPaths.splice(0)) {
    rmSync(path, { force: true, recursive: true });
  }
});

describe('writeAuditLog', () => {
  test('appends a JSONL event for blocked commands', () => {
    const logDir = mkdtempSync(join(tmpdir(), 'codex-safeguard-'));
    cleanupPaths.push(logDir);

    writeAuditLog({
      command: 'git reset --hard',
      cwd: '/repo',
      logDir,
      reason: 'blocked for test',
      rule: 'git-reset-hard',
      segment: 'git reset --hard',
      sessionId: 'session-1',
    });

    const content = readFileSync(join(logDir, 'session-1.jsonl'), 'utf-8');

    expect(content).toContain('git reset --hard');
    expect(content).toContain('git-reset-hard');
  });

  test('places audit logs under a codex-specific directory by default', () => {
    const logDir = getDefaultLogDir('/tmp/home-for-test');

    expect(logDir).toBe('/tmp/home-for-test/.codex-safeguard/logs');
  });
});
