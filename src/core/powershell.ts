import { basename } from 'node:path';

export interface PowerShellEncodedInvocation {
  command: string;
  encodedCommand: string;
  kind: 'encoded';
}

export interface PowerShellScriptInvocation {
  kind: 'script';
  script: string;
}

export type PowerShellInvocation = PowerShellEncodedInvocation | PowerShellScriptInvocation;

const POWERSHELL_EXECUTABLES = new Set(['powershell', 'powershell.exe', 'pwsh', 'pwsh.exe']);

const COMMAND_FLAGS = new Set(['-c', '-command', '/command']);
const ENCODED_COMMAND_FLAGS = new Set(['-e', '-enc', '-encodedcommand', '/encodedcommand']);
const IGNORED_FLAGS = new Set(['-nologo', '-noprofile', '-noninteractive']);

export function isPowerShellExecutable(token: string): boolean {
  return POWERSHELL_EXECUTABLES.has(basename(token).toLowerCase());
}

export function extractPowerShellInvocation(
  tokens: readonly string[],
  originalCommand: string,
): PowerShellInvocation | null {
  if (tokens.length === 0 || !isPowerShellExecutable(tokens[0])) {
    return null;
  }

  const args = tokens.slice(1);

  if (args.length === 0) {
    return null;
  }

  let index = 0;

  while (index < args.length) {
    const current = args[index];
    const lowerCurrent = current.toLowerCase();

    if (ENCODED_COMMAND_FLAGS.has(lowerCurrent)) {
      return {
        command: originalCommand,
        encodedCommand: args[index + 1] ?? '',
        kind: 'encoded',
      };
    }

    if (COMMAND_FLAGS.has(lowerCurrent)) {
      const script = args
        .slice(index + 1)
        .join(' ')
        .trim();

      return script ? { kind: 'script', script } : null;
    }

    if (lowerCurrent.startsWith('-command:') || lowerCurrent.startsWith('/command:')) {
      const separatorIndex = current.indexOf(':');
      const script = current.slice(separatorIndex + 1).trim();

      return script ? { kind: 'script', script } : null;
    }

    if (
      lowerCurrent.startsWith('-encodedcommand:') ||
      lowerCurrent.startsWith('/encodedcommand:')
    ) {
      const separatorIndex = current.indexOf(':');

      return {
        command: originalCommand,
        encodedCommand: current.slice(separatorIndex + 1).trim(),
        kind: 'encoded',
      };
    }

    if (IGNORED_FLAGS.has(lowerCurrent)) {
      index += 1;
      continue;
    }

    if (current.startsWith('-') || current.startsWith('/')) {
      index += 1;
      continue;
    }

    return {
      kind: 'script',
      script: args.slice(index).join(' ').trim(),
    };
  }

  return null;
}

export function splitPowerShellSegments(script: string): string[] {
  const segments: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < script.length; index += 1) {
    const char = script[index] ?? '';
    const next = script[index + 1] ?? '';

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if ((char === '&' && next === '&') || (char === '|' && next === '|')) {
        if (current.trim()) {
          segments.push(current.trim());
        }
        current = '';
        index += 1;
        continue;
      }

      if (char === ';' || char === '|') {
        if (current.trim()) {
          segments.push(current.trim());
        }
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

export function tokenizePowerShellSegment(segment: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < segment.length; index += 1) {
    const char = segment[index] ?? '';

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && /\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}
