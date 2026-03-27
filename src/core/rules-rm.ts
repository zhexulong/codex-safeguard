import type { AnalyzeOptions, AnalyzeResult } from './types.js';

function hasRecursiveForce(args: readonly string[]): boolean {
  const flags = args.filter((arg) => arg.startsWith('-')).join('');

  return flags.includes('r') && flags.includes('f');
}

function isDangerousTarget(target: string): boolean {
  return (
    target === '/' ||
    target === '~' ||
    target === '~/' ||
    target.startsWith('~/') ||
    target === '$HOME' ||
    target.startsWith('$HOME/')
  );
}

export function analyzeRm(
  tokens: readonly string[],
  command: string,
  _options: AnalyzeOptions,
): AnalyzeResult | null {
  if (tokens[0] !== 'rm') {
    return null;
  }

  const args = tokens.slice(1);
  const targets = args.filter((arg) => !arg.startsWith('-'));

  if (!hasRecursiveForce(args)) {
    return null;
  }

  if (targets.some(isDangerousTarget)) {
    return {
      reason:
        'Blocked destructive rm -rf command because it targets a root or home path. Do not replace this with other shell, interpreter, or PowerShell deletion commands on the same targets.',
      rule: 'rm-root-or-home',
      segment: command,
    };
  }

  return null;
}
