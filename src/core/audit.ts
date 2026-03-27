import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface WriteAuditLogOptions {
  command: string;
  cwd: string;
  logDir?: string;
  reason: string;
  rule: string;
  segment: string;
  sessionId: string;
  timestamp?: string;
}

export function getDefaultLogDir(homeDir = process.env.HOME ?? ''): string {
  return join(homeDir, '.codex-safeguard', 'logs');
}

export function writeAuditLog(options: WriteAuditLogOptions): void {
  const logDir = options.logDir ?? getDefaultLogDir();

  try {
    mkdirSync(logDir, { recursive: true });

    const logPath = join(logDir, `${options.sessionId}.jsonl`);
    const entry = {
      command: options.command,
      cwd: options.cwd,
      reason: options.reason,
      rule: options.rule,
      segment: options.segment,
      sessionId: options.sessionId,
      timestamp: options.timestamp ?? new Date().toISOString(),
    };

    appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf-8');
  } catch (error) {
    void error;
  }
}
