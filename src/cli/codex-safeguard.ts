#!/usr/bin/env bun

import { handlePreToolUse } from '../codex/pre-tool-use.js';
import { handleStop } from '../codex/stop.js';
import { runDoctor } from './doctor.js';
import { explainCommand } from './explain.js';

export interface CliIo {
  cwd: string;
  homeDir?: string;
  readStdin: () => Promise<string>;
  stderr: (line: string) => void;
  stdout: (line: string) => void;
}

export function bootstrapReady(): boolean {
  return true;
}

function createDefaultIo(): CliIo {
  return {
    cwd: process.cwd(),
    homeDir: process.env.HOME,
    readStdin: async () => {
      const chunks: Buffer[] = [];

      for await (const chunk of process.stdin) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks).toString('utf-8');
    },
    stderr: (line) => console.error(line),
    stdout: (line) => console.log(line),
  };
}

function formatExplainOutput(command: string, cwd: string): string {
  const result = explainCommand(command, { cwd });

  if (!result.blocked) {
    return `ALLOWED\n\nCommand: ${command}\n\nReason: ${result.reason}`;
  }

  return [
    'BLOCKED',
    `Command: ${command}`,
    `Rule: ${result.rule ?? 'unknown'}`,
    `Reason: ${result.reason}`,
  ].join('\n\n');
}

export async function runCli(args: string[], io: Partial<CliIo> = {}): Promise<number> {
  const runtime = {
    ...createDefaultIo(),
    ...io,
  } as CliIo;

  const [command, ...rest] = args;

  if (!command) {
    runtime.stderr('Usage: codex-safeguard <pre-tool-use|stop|explain|doctor>');
    return 1;
  }

  if (command === 'explain') {
    const shellCommand = rest.join(' ').trim();

    if (!shellCommand) {
      runtime.stderr('Usage: codex-safeguard explain <command>');
      return 1;
    }

    runtime.stdout(formatExplainOutput(shellCommand, runtime.cwd));
    return 0;
  }

  if (command === 'doctor') {
    const report = await runDoctor({ cwd: runtime.cwd, homeDir: runtime.homeDir });
    runtime.stdout(report.summary);
    runtime.stdout(`Hook status: ${report.hookConfig.status} (${report.hookConfig.path})`);
    runtime.stdout(
      `Self-test: blocked=${report.selfTest.blocked} allowed=${report.selfTest.allowed} failed=${report.selfTest.failed}`,
    );
    runtime.stdout(
      `Recent activity: ${report.recentActivity.sessionFiles} session log(s) in ${report.recentActivity.logDir}`,
    );
    return report.ok ? 0 : 1;
  }

  if (command === 'pre-tool-use') {
    const inputText = (await runtime.readStdin()).trim();

    if (!inputText) {
      return 0;
    }

    let parsedInput: Parameters<typeof handlePreToolUse>[0];

    try {
      parsedInput = JSON.parse(inputText) as Parameters<typeof handlePreToolUse>[0];
    } catch {
      return 0;
    }

    const payload = handlePreToolUse(parsedInput);

    if (payload) {
      runtime.stdout(JSON.stringify(payload));
    }

    return 0;
  }

  if (command === 'stop') {
    const inputText = (await runtime.readStdin()).trim();

    if (!inputText) {
      return 0;
    }

    let parsedInput: Parameters<typeof handleStop>[0];

    try {
      parsedInput = JSON.parse(inputText) as Parameters<typeof handleStop>[0];
    } catch {
      return 0;
    }

    const payload = handleStop(parsedInput);

    if (payload) {
      runtime.stdout(JSON.stringify(payload));
    }

    return 0;
  }

  runtime.stderr(`Unknown command: ${command}`);
  return 1;
}

if (import.meta.main) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exit(exitCode);
}
