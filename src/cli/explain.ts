import { type AnalyzeOptions, analyzeCommand } from '../core/analyze.js';

export interface ExplainResult {
  blocked: boolean;
  reason: string;
  rule: string | null;
  segment: string | null;
}

export function explainCommand(command: string, options: AnalyzeOptions = {}): ExplainResult {
  const result = analyzeCommand(command, options);

  if (!result) {
    return {
      blocked: false,
      reason: 'No blocking rule matched this command.',
      rule: null,
      segment: null,
    };
  }

  return {
    blocked: true,
    reason: result.reason,
    rule: result.rule,
    segment: result.segment,
  };
}
