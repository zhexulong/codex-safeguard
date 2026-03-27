import { analyzeGit } from './rules-git.js';
import type { AnalyzeOptions, AnalyzeResult } from './types.js';

const POWERSHELL_DELETE_COMMANDS = new Set(['del', 'erase', 'remove-item', 'ri', 'rm']);

function block(rule: string, reason: string, segment: string): AnalyzeResult {
  return {
    reason,
    rule,
    segment,
  };
}

function isDangerousPowerShellTarget(token: string): boolean {
  const normalized = token.toLowerCase();

  return (
    normalized === '/' ||
    normalized === '~' ||
    normalized === '~/' ||
    normalized === '~\\' ||
    normalized === '$home' ||
    normalized.startsWith('$home/') ||
    normalized.startsWith('$home\\') ||
    normalized === '$env:userprofile' ||
    normalized.startsWith('$env:userprofile/') ||
    normalized.startsWith('$env:userprofile\\') ||
    /^[a-z]:[\\/]*$/i.test(token)
  );
}

function hasFlag(tokens: readonly string[], ...needles: string[]): boolean {
  const lowerTokens = tokens.map((token) => token.toLowerCase());

  return needles.some((needle) => lowerTokens.includes(needle));
}

function analyzePowerShellDelete(tokens: readonly string[], command: string): AnalyzeResult | null {
  const head = tokens[0]?.toLowerCase();

  if (!head || !POWERSHELL_DELETE_COMMANDS.has(head)) {
    return null;
  }

  const args = tokens.slice(1);
  const recursive = hasFlag(args, '-r', '-recurse');
  const force = hasFlag(args, '-f', '-force');

  if (!recursive || !force) {
    return null;
  }

  const targets = args.filter((token) => !token.startsWith('-'));

  if (!targets.some(isDangerousPowerShellTarget)) {
    return null;
  }

  return block(
    'powershell-remove-item-destructive',
    'Blocked destructive PowerShell Remove-Item command because it targets a root or home path. Do not replace this with equivalent shell, interpreter, or alternate PowerShell deletion commands on the same targets.',
    command,
  );
}

export function analyzePowerShellTokens(
  tokens: readonly string[],
  command: string,
  _options: AnalyzeOptions,
): AnalyzeResult | null {
  return analyzePowerShellDelete(tokens, command) ?? analyzeGit(tokens, command);
}

export function blockPowerShellEncodedCommand(command: string): AnalyzeResult {
  return block(
    'powershell-encoded-command',
    'Blocked PowerShell encoded command because encoded payloads are conservatively treated as dangerous.',
    command,
  );
}
