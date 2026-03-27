import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import pkg from '../../package.json';

const readme = readFileSync(resolve(import.meta.dir, '../../README.md'), 'utf-8');

describe('windows compatibility metadata', () => {
  test('uses cross-platform cleanup scripts instead of unix-only rm -rf', () => {
    const scripts = Object.values(pkg.scripts ?? {});

    expect(scripts.some((script) => script.includes('rm -rf'))).toBe(false);
  });

  test('documents Windows-friendly installation commands in README', () => {
    expect(readme).toContain('Copy-Item');
    expect(readme).toContain('Windows PowerShell');
  });
});
