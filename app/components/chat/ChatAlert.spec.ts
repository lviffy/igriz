import { describe, expect, it } from 'vitest';
import type { ActionAlert } from '~/types/actions';
import { buildActionAlertPrompt } from './ChatAlert';

describe('buildActionAlertPrompt', () => {
  it('guides the AI to fix the code before rerunning a failed terminal command', () => {
    const prompt = buildActionAlertPrompt({
      type: 'error',
      title: 'Terminal Command Failed',
      description: 'Command Failed (exit code: 1)',
      content: 'Deployment failed: Priority is too low',
      failedCommand: 'node scripts/deploy.cjs',
      remainingCommands: ['npm run dev'],
      source: 'terminal',
    } satisfies ActionAlert);

    expect(prompt).toContain('Fix the relevant code, files, or config before retrying.');
    expect(prompt).toContain('Do not rerun the same failed command unchanged');
    expect(prompt).toContain('node scripts/deploy.cjs');
    expect(prompt).toContain('npm run dev');
  });

  it('prefers action-specific recovery instructions when they are provided', () => {
    const prompt = buildActionAlertPrompt({
      type: 'error',
      title: 'Dev Server Failed',
      description: 'Failed To Start Application',
      content: 'Cannot find module vite',
      failedCommand: 'npm run dev',
      recoveryInstructions: [
        '1. Fix the missing dependency issue first.',
        '2. Retry only npm run dev after the fix.',
      ].join('\n'),
      source: 'terminal',
    } satisfies ActionAlert);

    expect(prompt).toContain('Fix the missing dependency issue first.');
    expect(prompt).toContain('Retry only npm run dev after the fix.');
    expect(prompt).not.toContain('Follow this repair flow strictly:');
  });
});
