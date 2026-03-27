import { type ParseEntry, parse } from 'shell-quote';

const ASSIGNMENT_RE = /^[A-Za-z_][A-Za-z0-9_]*=/;
const SHELL_WRAPPERS = new Set(['bash', 'sh', 'zsh', 'dash']);

export function splitShellWords(command: string): string[] {
  return parse(command).flatMap((token: ParseEntry) => {
    if (typeof token === 'string') {
      return [token];
    }

    if ('pattern' in token && typeof token.pattern === 'string') {
      return [token.pattern];
    }

    return [];
  });
}

export function splitShellSegments(command: string): string[] {
  const segments: string[] = [];
  let current: string[] = [];

  for (const token of parse(command) as ParseEntry[]) {
    if (typeof token === 'string') {
      current.push(token);
      continue;
    }

    if ('pattern' in token && typeof token.pattern === 'string') {
      current.push(token.pattern);
      continue;
    }

    if ('op' in token && ['&&', '||', ';', '|'].includes(token.op)) {
      if (current.length > 0) {
        segments.push(current.join(' '));
        current = [];
      }
    }
  }

  if (current.length > 0) {
    segments.push(current.join(' '));
  }

  return segments.length > 0 ? segments : [command];
}

export function stripCommandPrefixes(tokens: readonly string[]): string[] {
  const cleaned = [...tokens];

  while (cleaned[0] === 'sudo') {
    cleaned.shift();
  }

  if (cleaned[0] === 'env') {
    cleaned.shift();

    while (cleaned[0] && ASSIGNMENT_RE.test(cleaned[0])) {
      cleaned.shift();
    }
  }

  return cleaned;
}

export function extractWrappedCommand(tokens: readonly string[]): string | null {
  if (tokens.length < 3 || !SHELL_WRAPPERS.has(tokens[0])) {
    return null;
  }

  const commandFlagIndex = tokens.findIndex((token, index) => {
    if (index === 0) {
      return false;
    }

    return token === '-c' || /^-[A-Za-z]*c[A-Za-z]*$/.test(token);
  });

  if (commandFlagIndex === -1) {
    return null;
  }

  return tokens[commandFlagIndex + 1] ?? null;
}
