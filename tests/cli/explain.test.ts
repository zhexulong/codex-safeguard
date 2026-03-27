import { describe, expect, test } from 'bun:test';

import { explainCommand } from '../../src/cli/explain';

describe('explainCommand', () => {
  test('returns a blocked explanation for git reset --hard', () => {
    const result = explainCommand('git reset --hard', { cwd: '/repo' });

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('git reset --hard');
    expect(result.rule).toBe('git-reset-hard');
  });

  test('returns an allowed explanation for benign commands', () => {
    const result = explainCommand('git status', { cwd: '/repo' });

    expect(result.blocked).toBe(false);
    expect(result.reason).toContain('No blocking rule matched');
  });

  test('returns a blocked explanation for dangerous powershell commands', () => {
    const result = explainCommand('pwsh -Command "git reset --hard"', { cwd: '/repo' });

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('git reset --hard');
  });
});
