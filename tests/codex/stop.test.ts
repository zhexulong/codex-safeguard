import { describe, expect, test } from 'bun:test';

import { handleStop } from '../../src/codex/stop';

describe('handleStop', () => {
  test('requests continuation when implementation is claimed without verification evidence', () => {
    const result = handleStop({
      cwd: '/repo',
      hook_event_name: 'Stop',
      last_assistant_message: 'Implemented the fix and updated the files.',
      stop_hook_active: false,
    });

    expect(result?.decision).toBe('block');
    expect(result?.reason).toContain('verification');
  });

  test('allows stopping when the assistant message includes verification evidence', () => {
    const result = handleStop({
      cwd: '/repo',
      hook_event_name: 'Stop',
      last_assistant_message: 'Implemented the fix and ran bun test plus typecheck successfully.',
      stop_hook_active: false,
    });

    expect(result).toBeNull();
  });
});
