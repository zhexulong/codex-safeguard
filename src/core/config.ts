import { join } from 'node:path';

import { getDefaultLogDir } from './audit.js';

export function getProjectHookConfigPath(cwd: string): string {
  return join(cwd, '.codex', 'hooks.json');
}

export function getAuditLogDir(homeDir?: string): string {
  return getDefaultLogDir(homeDir);
}
