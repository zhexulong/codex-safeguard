import { describe, expect, test } from 'bun:test';

import { handlePreToolUse } from '../../src/codex/pre-tool-use';

describe('handlePreToolUse', () => {
  test('returns a deny payload for destructive Bash commands', () => {
    const payload = handlePreToolUse({
      cwd: '/repo',
      hook_event_name: 'PreToolUse',
      session_id: 'session-1',
      tool_input: {
        command: 'git reset --hard',
      },
      tool_name: 'Bash',
    });

    expect(payload?.hookSpecificOutput?.hookEventName).toBe('PreToolUse');
    expect(payload?.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(payload?.hookSpecificOutput?.permissionDecisionReason).toContain('git reset --hard');
  });

  test('returns null for safe Bash commands', () => {
    const payload = handlePreToolUse({
      cwd: '/repo',
      hook_event_name: 'PreToolUse',
      tool_input: {
        command: 'git status',
      },
      tool_name: 'Bash',
    });

    expect(payload).toBeNull();
  });

  test('returns a deny payload for dangerous powershell commands invoked through Bash', () => {
    const payload = handlePreToolUse({
      cwd: '/repo',
      hook_event_name: 'PreToolUse',
      session_id: 'session-1',
      tool_input: {
        command: 'pwsh -Command "git reset --hard"',
      },
      tool_name: 'Bash',
    });

    expect(payload?.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(payload?.hookSpecificOutput?.permissionDecisionReason).toContain('git reset --hard');
  });

  test('still returns deny when audit logging cannot write to the default home directory', () => {
    const previousHome = process.env.HOME;
    process.env.HOME = '/proc';

    try {
      const payload = handlePreToolUse({
        cwd: '/repo',
        hook_event_name: 'PreToolUse',
        session_id: 'session-1',
        tool_input: {
          command: 'git reset --hard',
        },
        tool_name: 'Bash',
      });

      expect(payload?.hookSpecificOutput?.permissionDecision).toBe('deny');
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
    }
  });

  test('permissionDecisionReason for git clean warns against equivalent direct deletion', () => {
    const payload = handlePreToolUse({
      cwd: '/repo',
      hook_event_name: 'PreToolUse',
      session_id: 'session-1',
      tool_input: {
        command: 'git clean -fd',
      },
      tool_name: 'Bash',
    });

    expect(payload?.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(payload?.hookSpecificOutput?.permissionDecisionReason).toContain(
      'Do not replace this with direct file deletion',
    );
    expect(payload?.hookSpecificOutput?.permissionDecisionReason).toContain('git clean -nd');
  });

  test('permissionDecisionReason for git reset warns against equivalent bypasses', () => {
    const payload = handlePreToolUse({
      cwd: '/repo',
      hook_event_name: 'PreToolUse',
      session_id: 'session-1',
      tool_input: {
        command: 'git reset --hard',
      },
      tool_name: 'Bash',
    });

    expect(payload?.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(payload?.hookSpecificOutput?.permissionDecisionReason).toContain(
      'Do not replace this with',
    );
  });
});
