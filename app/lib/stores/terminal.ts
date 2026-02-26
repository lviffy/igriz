import type { WebContainer, WebContainerProcess } from '@webcontainer/api';
import { atom, type WritableAtom } from 'nanostores';
import type { ITerminal } from '~/types/terminal';
import { createScopedLogger } from '~/utils/logger';
import { newShellProcess } from '~/utils/shell';
import { coloredText } from '~/utils/terminal';

const logger = createScopedLogger('TerminalStore');

export class TerminalStore {
  #webcontainer: Promise<WebContainer>;
  #terminals: Array<{ terminal: ITerminal; process: WebContainerProcess }> = [];

  showTerminal: WritableAtom<boolean> = import.meta.hot?.data.showTerminal ?? atom(false);

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;

    logger.trace('[INIT] TerminalStore initialized');

    if (import.meta.hot) {
      import.meta.hot.data.showTerminal = this.showTerminal;
    }
  }

  toggleTerminal(value?: boolean) {
    const newValue = value !== undefined ? value : !this.showTerminal.get();
    logger.debug(`[TOGGLE] Terminal visibility: ${newValue}`);
    this.showTerminal.set(newValue);
  }

  async attachTerminal(terminal: ITerminal) {
    try {
      const shellProcess = await newShellProcess(await this.#webcontainer, terminal);
      this.#terminals.push({ terminal, process: shellProcess });
      logger.debug('[ATTACH] Terminal attached with shell process');
    } catch (error: any) {
      logger.error('[ATTACH] Failed to spawn shell');
      terminal.write(coloredText.red('Failed to spawn shell\n\n') + (error?.message ?? 'Unknown error'));
      return;
    }
  }

  onTerminalResize(cols: number, rows: number) {
    logger.debug(`[RESIZE] Resizing ${this.#terminals.length} terminals to ${cols}x${rows}`);
    
    for (const { process } of this.#terminals) {
      process.resize({ cols, rows });
    }
  }
}
