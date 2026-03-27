export interface CodexStopInput {
  cwd?: string;
  hook_event_name: string;
  last_assistant_message?: string | null;
  stop_hook_active: boolean;
}

export interface CodexStopOutput {
  decision: 'block';
  reason: string;
}

const IMPLEMENTATION_RE =
  /\b(implemented|updated|modified|changed|fixed|patched|refactored|added)\b/i;
const VERIFICATION_RE =
  /\b(test|typecheck|build|lint|verified|verification|pass|passing|passed)\b/i;

export function handleStop(input: CodexStopInput): CodexStopOutput | null {
  if (input.stop_hook_active) {
    return null;
  }

  const message = input.last_assistant_message ?? '';

  if (!IMPLEMENTATION_RE.test(message)) {
    return null;
  }

  if (VERIFICATION_RE.test(message)) {
    return null;
  }

  return {
    decision: 'block',
    reason:
      'Continue and run verification before stopping. The last assistant message claims implementation without verification evidence.',
  };
}
