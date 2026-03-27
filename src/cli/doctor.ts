import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';

import { analyzeCommand } from '../core/analyze.js';
import { getAuditLogDir, getProjectHookConfigPath } from '../core/config.js';

export interface DoctorHookConfig {
  path: string;
  status: 'configured' | 'invalid' | 'missing';
}

export interface DoctorSelfTestReport {
  allowed: number;
  blocked: number;
  failed: number;
}

export interface DoctorReport {
  hookConfig: DoctorHookConfig;
  ok: boolean;
  recentActivity: {
    logDir: string;
    sessionFiles: number;
  };
  selfTest: DoctorSelfTestReport;
  summary: string;
}

export interface RunDoctorOptions {
  cwd: string;
  homeDir?: string;
}

interface SelfTestCase {
  blocked: boolean;
  command: string;
}

interface HookDefinition {
  command?: string;
  hooks?: HookDefinition[];
  matcher?: string;
  type?: string;
}

interface HookConfigFile {
  hooks?: {
    PreToolUse?: HookDefinition[];
    Stop?: HookDefinition[];
  };
}

const SELF_TEST_CASES: readonly SelfTestCase[] = [
  { blocked: true, command: 'git reset --hard' },
  { blocked: true, command: "bash -c 'rm -rf /'" },
  { blocked: false, command: 'git status' },
];

function runSelfTest(cwd: string): DoctorSelfTestReport {
  let blocked = 0;
  let allowed = 0;
  let failed = 0;

  for (const testCase of SELF_TEST_CASES) {
    const result = analyzeCommand(testCase.command, { cwd });
    const isBlocked = result !== null;

    if (isBlocked) {
      blocked += 1;
    } else {
      allowed += 1;
    }

    if (isBlocked !== testCase.blocked) {
      failed += 1;
    }
  }

  return {
    allowed,
    blocked,
    failed,
  };
}

function countSessionFiles(logDir: string): number {
  if (!existsSync(logDir)) {
    return 0;
  }

  return readdirSync(logDir).filter((entry) => entry.endsWith('.jsonl')).length;
}

function hookListContainsCommand(
  entries: readonly HookDefinition[] | undefined,
  expectedParts: readonly string[],
): boolean {
  if (!entries) {
    return false;
  }

  for (const entry of entries) {
    if (entry.type === 'command' && entry.command) {
      const matches = expectedParts.every((part) => entry.command?.includes(part));

      if (matches) {
        return true;
      }
    }

    if (entry.hooks && hookListContainsCommand(entry.hooks, expectedParts)) {
      return true;
    }
  }

  return false;
}

function extractReferencedScriptPath(command: string): string | null {
  const match = command.match(
    /(?:^|\s)(?:node|bun|python|python3|\/usr\/bin\/python3)\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))/,
  );

  const candidate = match?.[1] ?? match?.[2] ?? match?.[3] ?? null;

  if (!candidate || !isAbsolute(candidate)) {
    return null;
  }

  return candidate;
}

function hookListHasMissingCommandTarget(
  entries: readonly HookDefinition[] | undefined,
  expectedParts: readonly string[],
): boolean {
  if (!entries) {
    return false;
  }

  for (const entry of entries) {
    if (entry.type === 'command' && entry.command) {
      const matches = expectedParts.every((part) => entry.command?.includes(part));

      if (matches) {
        const targetPath = extractReferencedScriptPath(entry.command);

        if (targetPath && !existsSync(targetPath)) {
          return true;
        }
      }
    }

    if (entry.hooks && hookListHasMissingCommandTarget(entry.hooks, expectedParts)) {
      return true;
    }
  }

  return false;
}

function readHookConfigStatus(hookConfigPath: string): DoctorHookConfig {
  if (!existsSync(hookConfigPath)) {
    return {
      path: hookConfigPath,
      status: 'missing',
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(hookConfigPath, 'utf-8')) as HookConfigFile;
    const hasPreToolUse = hookListContainsCommand(parsed.hooks?.PreToolUse, [
      'codex-safeguard',
      'pre-tool-use',
    ]);
    const hasStop = hookListContainsCommand(parsed.hooks?.Stop, ['codex-safeguard', 'stop']);
    const preToolUseMissingTarget = hookListHasMissingCommandTarget(parsed.hooks?.PreToolUse, [
      'codex-safeguard',
      'pre-tool-use',
    ]);
    const stopMissingTarget = hookListHasMissingCommandTarget(parsed.hooks?.Stop, [
      'codex-safeguard',
      'stop',
    ]);

    return {
      path: hookConfigPath,
      status:
        hasPreToolUse && hasStop && !preToolUseMissingTarget && !stopMissingTarget
          ? 'configured'
          : 'invalid',
    };
  } catch {
    return {
      path: hookConfigPath,
      status: 'invalid',
    };
  }
}

export async function runDoctor(options: RunDoctorOptions): Promise<DoctorReport> {
  const hookConfigPath = getProjectHookConfigPath(options.cwd);
  const hookConfig = readHookConfigStatus(hookConfigPath);

  const selfTest = runSelfTest(options.cwd);
  const logDir = getAuditLogDir(options.homeDir);
  const recentActivity = {
    logDir,
    sessionFiles: countSessionFiles(logDir),
  };
  const ok = hookConfig.status === 'configured' && selfTest.failed === 0;
  const summary = ok
    ? 'Doctor check passed: hooks configured and self-test succeeded.'
    : 'Doctor check failed: hooks are missing/invalid or the self-test reported failures.';

  return {
    hookConfig,
    ok,
    recentActivity,
    selfTest,
    summary,
  };
}
