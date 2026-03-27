import {
  extractPowerShellInvocation,
  splitPowerShellSegments,
  tokenizePowerShellSegment,
} from './powershell.js';
import { analyzeGit } from './rules-git.js';
import { analyzeInterpreter } from './rules-interpreters.js';
import { analyzePowerShellTokens, blockPowerShellEncodedCommand } from './rules-powershell.js';
import { analyzeRm } from './rules-rm.js';
import {
  extractWrappedCommand,
  splitShellSegments,
  splitShellWords,
  stripCommandPrefixes,
} from './shell.js';
import type { AnalyzeOptions, AnalyzeResult } from './types.js';

const MAX_WRAPPER_DEPTH = 5;

export function analyzeCommand(
  command: string,
  options: AnalyzeOptions = {},
): AnalyzeResult | null {
  return analyzeCommandInternal(command, options, 0);
}

function analyzeCommandInternal(
  command: string,
  options: AnalyzeOptions,
  depth: number,
): AnalyzeResult | null {
  if (depth > MAX_WRAPPER_DEPTH) {
    return null;
  }

  const segments = splitShellSegments(command);

  if (segments.length > 1) {
    for (const segment of segments) {
      const segmentResult = analyzeCommandInternal(segment, options, depth + 1);

      if (segmentResult) {
        return segmentResult;
      }
    }

    return null;
  }

  const rawTokens = splitShellWords(command);
  const tokens = stripCommandPrefixes(rawTokens);

  if (tokens.length === 0) {
    return null;
  }

  const powerShellInvocation = extractPowerShellInvocation(tokens, command);

  if (powerShellInvocation) {
    if (powerShellInvocation.kind === 'encoded') {
      return blockPowerShellEncodedCommand(command);
    }

    for (const segment of splitPowerShellSegments(powerShellInvocation.script)) {
      const segmentTokens = tokenizePowerShellSegment(segment);

      if (segmentTokens.length === 0) {
        continue;
      }

      const result =
        analyzePowerShellTokens(segmentTokens, segment, options) ??
        analyzeCommandInternal(segment, options, depth + 1);

      if (result) {
        return result;
      }
    }

    return null;
  }

  const wrappedCommand = extractWrappedCommand(tokens);

  if (wrappedCommand) {
    return analyzeCommandInternal(wrappedCommand, options, depth + 1);
  }

  return (
    analyzeInterpreter(tokens, command) ??
    analyzeGit(tokens, command) ??
    analyzeRm(tokens, command, options)
  );
}

export type { AnalyzeOptions, AnalyzeResult } from './types.js';
