import { describe, expect, test } from 'bun:test';

import { analyzeCommand } from '../../src/core/analyze';

describe('analyzeCommand', () => {
  test('blocks git reset --hard', () => {
    const result = analyzeCommand('git reset --hard', { cwd: '/repo' });

    expect(result?.reason).toContain('git reset --hard');
  });

  test('git reset block reason warns against equivalent bypasses', () => {
    const result = analyzeCommand('git reset --hard', { cwd: '/repo' });

    expect(result?.reason).toContain('Do not replace this with');
  });

  test('allows git status', () => {
    const result = analyzeCommand('git status', { cwd: '/repo' });

    expect(result).toBeNull();
  });

  test('blocks bash wrapper with destructive rm command', () => {
    const result = analyzeCommand("bash -c 'rm -rf /'", { cwd: '/repo' });

    expect(result?.reason).toContain('rm -rf');
  });

  test('blocks force push without force-with-lease', () => {
    const result = analyzeCommand('git push --force origin main', { cwd: '/repo' });

    expect(result?.reason).toContain('force push');
  });

  test('force push block reason warns against equivalent bypasses', () => {
    const result = analyzeCommand('git push --force origin main', { cwd: '/repo' });

    expect(result?.reason).toContain('Do not replace this with');
    expect(result?.reason).toContain('--force-with-lease');
  });

  test('blocks destructive commands in compound shell command chains', () => {
    const result = analyzeCommand('echo ok && git reset --hard', { cwd: '/repo' });

    expect(result?.reason).toContain('git reset --hard');
  });

  test('blocks destructive interpreter one-liners', () => {
    const result = analyzeCommand('python -c \'import os; os.system("rm -rf /")\'', {
      cwd: '/repo',
    });

    expect(result?.reason).toContain('interpreter');
  });

  test('blocks pwsh git reset --hard', () => {
    const result = analyzeCommand('pwsh -Command "git reset --hard"', { cwd: '/repo' });

    expect(result?.reason).toContain('git reset --hard');
  });

  test('blocks powershell remove-item against home directory', () => {
    const result = analyzeCommand('powershell -Command "Remove-Item -Recurse -Force ~"', {
      cwd: '/repo',
    });

    expect(result?.reason).toContain('Remove-Item');
  });

  test('blocks dangerous commands later in a powershell chain', () => {
    const result = analyzeCommand('pwsh -Command "Write-Host ok; git clean -fd"', {
      cwd: '/repo',
    });

    expect(result?.reason).toContain('git clean');
  });

  test('git clean block reason warns against equivalent direct deletion', () => {
    const result = analyzeCommand('git clean -fd', { cwd: '/repo' });

    expect(result?.reason).toContain('Do not replace this with direct file deletion');
    expect(result?.reason).toContain('git clean -nd');
  });

  test('git checkout file discard reason warns against equivalent bypasses', () => {
    const result = analyzeCommand('git checkout -- README.md', { cwd: '/repo' });

    expect(result?.reason).toContain('Do not replace this with');
  });

  test('allows safe pwsh git status', () => {
    const result = analyzeCommand('pwsh git status', { cwd: '/repo' });

    expect(result).toBeNull();
  });

  test('allows non-recursive remove-item of a regular file', () => {
    const result = analyzeCommand('pwsh -Command "Remove-Item foo.txt"', { cwd: '/repo' });

    expect(result).toBeNull();
  });

  test('blocks pwsh git push --force', () => {
    const result = analyzeCommand('pwsh -Command "git push --force origin main"', {
      cwd: '/repo',
    });

    expect(result?.reason).toContain('force push');
  });

  test('rm root-or-home reason warns against equivalent bypasses', () => {
    const result = analyzeCommand('rm -rf ~', { cwd: '/repo' });

    expect(result?.reason).toContain('Do not replace this with');
  });

  test('powershell remove-item reason warns against equivalent bypasses', () => {
    const result = analyzeCommand('pwsh -Command "Remove-Item -Recurse -Force ~"', {
      cwd: '/repo',
    });

    expect(result?.reason).toContain('Do not replace this with');
  });

  test('blocks encoded powershell commands conservatively', () => {
    const result = analyzeCommand('pwsh -EncodedCommand Z2l0IHJlc2V0IC0taGFyZA==', {
      cwd: '/repo',
    });

    expect(result?.rule).toBe('powershell-encoded-command');
  });
});
