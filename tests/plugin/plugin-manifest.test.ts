import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import manifest from '../../.codex-plugin/plugin.json';
import pkg from '../../package.json';

describe('plugin manifest', () => {
  test('points Codex at bundled skills', () => {
    expect(manifest.name).toBe('codex-safeguard');
    expect(manifest.skills).toBe('./skills/');
  });

  test('ships the hook template and core skill files', () => {
    expect(existsSync(resolve(import.meta.dir, '../../.codex/hooks.template.json'))).toBe(true);
    expect(existsSync(resolve(import.meta.dir, '../../skills/install-safety-net/SKILL.md'))).toBe(
      true,
    );
    expect(existsSync(resolve(import.meta.dir, '../../skills/doctor/SKILL.md'))).toBe(true);
    expect(existsSync(resolve(import.meta.dir, '../../skills/explain-block/SKILL.md'))).toBe(true);
  });

  test('publishes a bin path that matches the tsc build output', () => {
    expect(pkg.bin['codex-safeguard']).toBe('dist/src/cli/codex-safeguard.js');
  });
});
