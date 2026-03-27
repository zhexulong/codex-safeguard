import { describe, expect, test } from 'bun:test';

describe('repository bootstrap', () => {
  test('exports a CLI entrypoint module', async () => {
    const module = await import('../src/cli/codex-safeguard');

    expect(module).toBeTruthy();
  });
});
