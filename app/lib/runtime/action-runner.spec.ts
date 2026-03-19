import { describe, expect, it, vi } from 'vitest';
import type { ActionAlert } from '~/types/actions';
import type { ActionCallbackData } from './message-parser';
import { ActionRunner, splitSequentialShellCommands } from './action-runner';

function createWebContainerStub() {
  return {
    workdir: '/project',
    fs: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockRejectedValue(new Error('Not found')),
      readdir: vi.fn().mockRejectedValue(new Error('Not found')),
    },
  };
}

function createShellStub(commandResults: Record<string, { exitCode: number; output: string }>) {
  const executeCommand = vi.fn().mockImplementation(async (_sessionId: string, command: string) => {
    return commandResults[command] ?? { exitCode: 0, output: `${command} ok` };
  });

  return {
    executeCommand,
    shell: {
      ready: vi.fn().mockResolvedValue(undefined),
      terminal: {},
      process: {},
      executeCommand,
    },
  };
}

function createActionData(actionId: string, action: ActionCallbackData['action']): ActionCallbackData {
  return {
    artifactId: 'artifact-1',
    messageId: 'message-1',
    actionId,
    action,
  };
}

describe('splitSequentialShellCommands', () => {
  it('splits simple multiline command blocks into sequential commands', () => {
    expect(
      splitSequentialShellCommands(`
        pnpm install
        node scripts/compile.cjs

        node scripts/deploy.cjs
      `),
    ).toEqual(['pnpm install', 'node scripts/compile.cjs', 'node scripts/deploy.cjs']);
  });

  it('keeps complex control-flow blocks intact', () => {
    const command = `if [ -f package.json ]; then
  npm install
fi`;

    expect(splitSequentialShellCommands(command)).toEqual([command]);
  });
});

describe('ActionRunner shell sequencing', () => {
  it('runs multiline shell commands one-by-one and aborts later actions after a failure', async () => {
    const shellStub = createShellStub({
      'pnpm install': { exitCode: 0, output: 'install ok' },
      'node scripts/compile.cjs': { exitCode: 1, output: 'compile failed' },
    });
    const alerts: ActionAlert[] = [];
    const runner = new ActionRunner(
      Promise.resolve(createWebContainerStub() as any),
      () => shellStub.shell as any,
      (alert) => alerts.push(alert),
    );

    const shellAction = createActionData('0', {
      type: 'shell',
      content: `pnpm install
node scripts/compile.cjs
node scripts/deploy.cjs`,
    });
    const startAction = createActionData('1', {
      type: 'start',
      content: 'npm run dev',
    });

    runner.addAction(shellAction);
    runner.addAction(startAction);

    await runner.runAction(shellAction);
    await runner.runAction(startAction);

    expect(shellStub.executeCommand.mock.calls.map(([, command]) => command)).toEqual([
      'pnpm install',
      'node scripts/compile.cjs',
    ]);
    expect(runner.actions.get()['0'].status).toBe('failed');
    expect(runner.actions.get()['1'].status).toBe('aborted');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].failedCommand).toBe('node scripts/compile.cjs');
    expect(alerts[0].remainingCommands).toEqual(['node scripts/deploy.cjs', 'npm run dev']);
    expect(alerts[0].source).toBe('terminal');
  });
});
