export interface CodexBashToolInput {
  command?: string;
}

export interface CodexPreToolUseInput {
  cwd?: string;
  hook_event_name: string;
  session_id?: string;
  tool_input?: CodexBashToolInput;
  tool_name?: string;
}

export interface CodexPreToolUseOutput {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'deny';
    permissionDecisionReason: string;
  };
}
