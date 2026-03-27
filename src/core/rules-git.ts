import type { AnalyzeResult } from './types.js';

function block(rule: string, reason: string, segment: string): AnalyzeResult {
  return {
    reason,
    rule,
    segment,
  };
}

function hasCompactFlag(args: readonly string[], flag: string): boolean {
  return args.some((arg) => arg.startsWith('-') && arg.includes(flag));
}

export function analyzeGit(tokens: readonly string[], command: string): AnalyzeResult | null {
  if (tokens[0] !== 'git') {
    return null;
  }

  const subcommand = tokens[1];
  const args = tokens.slice(2);

  if (subcommand === 'reset' && args.includes('--hard')) {
    return block(
      'git-reset-hard',
      'Blocked destructive git reset --hard command because it discards tracked changes. Do not replace this with other discard commands or direct file deletion on the same targets.',
      command,
    );
  }

  if (subcommand === 'checkout') {
    const separatorIndex = args.indexOf('--');

    if (separatorIndex !== -1 && args[separatorIndex + 1]) {
      return block(
        'git-checkout-files',
        'Blocked git checkout -- <files> because it discards file changes. Do not replace this with other discard commands or direct file deletion on the same targets.',
        command,
      );
    }
  }

  if (subcommand === 'clean' && hasCompactFlag(args, 'f') && hasCompactFlag(args, 'd')) {
    return block(
      'git-clean-force',
      'Blocked destructive git clean -fd style command because it deletes untracked files permanently. Use `git clean -nd` to preview first. Do not replace this with direct file deletion such as `rm`, `rm -f`, `rm -rf`, or `Remove-Item` on the same targets.',
      command,
    );
  }

  if (subcommand === 'push') {
    const hasForce = args.includes('--force') || args.includes('-f') || hasCompactFlag(args, 'f');

    if (hasForce && !args.includes('--force-with-lease')) {
      return block(
        'git-push-force',
        'Blocked force push without --force-with-lease because it can overwrite remote history. Use `--force-with-lease` if you truly need to update the remote. Do not replace this with other history-rewriting commands on the same branch.',
        command,
      );
    }
  }

  return null;
}
