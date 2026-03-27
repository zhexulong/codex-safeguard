import type { AnalyzeResult } from './types.js';

const INTERPRETERS = new Set(['python', 'python3', 'node', 'ruby', 'perl']);
const SCRIPT_FLAGS = new Set(['-c', '-e']);

const DESTRUCTIVE_PATTERNS: readonly { reason: string; regex: RegExp }[] = [
  {
    reason: 'rm -rf against a root or home path',
    regex: /rm\s+-[A-Za-z]*r[A-Za-z]*f[A-Za-z]*\s+(?:\/|~\/?|~\/|\$HOME(?:\/|\b))/,
  },
  {
    reason: 'git reset --hard',
    regex: /git\s+reset\s+--hard\b/,
  },
  {
    reason: 'git checkout -- <files>',
    regex: /git\s+checkout\s+--\s+\S+/,
  },
  {
    reason: 'git clean -fd style deletion',
    regex: /git\s+clean\s+-[^\s]*f[^\s]*d/,
  },
  {
    reason: 'force push without force-with-lease',
    regex: /git\s+push\s+(?:(?:[^\n]*\s)--force\b|(?:[^\n]*\s)-f\b)/,
  },
];

export function analyzeInterpreter(
  tokens: readonly string[],
  command: string,
): AnalyzeResult | null {
  if (!INTERPRETERS.has(tokens[0])) {
    return null;
  }

  const flagIndex = tokens.findIndex((token, index) => index > 0 && SCRIPT_FLAGS.has(token));

  if (flagIndex === -1) {
    return null;
  }

  const script = tokens[flagIndex + 1];

  if (!script) {
    return null;
  }

  for (const pattern of DESTRUCTIVE_PATTERNS) {
    if (pattern.regex.test(script)) {
      return {
        reason: `Blocked destructive interpreter one-liner because it contains ${pattern.reason}.`,
        rule: 'interpreter-destructive-command',
        segment: command,
      };
    }
  }

  return null;
}
