import { analyzeCommand } from '../core/analyze.js';
import { writeAuditLog } from '../core/audit.js';
import type { CodexPreToolUseInput, CodexPreToolUseOutput } from './types.js';

function formatDeniedMessage(reason: string, command: string): string {
  return ['BLOCKED by Codex Safeguard', `Reason: ${reason}`, `Command: ${command}`].join('\n\n');
}

export function handlePreToolUse(input: CodexPreToolUseInput): CodexPreToolUseOutput | null {
  if (input.tool_name !== 'Bash') {
    return null;
  }

  const command = input.tool_input?.command;

  if (!command) {
    return null;
  }

  const result = analyzeCommand(command, { cwd: input.cwd ?? process.cwd() });

  if (!result) {
    return null;
  }

  if (input.session_id) {
    writeAuditLog({
      command,
      cwd: input.cwd ?? process.cwd(),
      reason: result.reason,
      rule: result.rule,
      segment: result.segment,
      sessionId: input.session_id,
    });
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: formatDeniedMessage(result.reason, command),
    },
  };
}
