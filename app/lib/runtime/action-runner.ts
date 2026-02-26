import { WebContainer } from '@webcontainer/api';
import { map, type MapStore } from 'nanostores';
import * as nodePath from 'node:path';
import type { BoltAction } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import type { ActionCallbackData } from './message-parser';

const logger = createScopedLogger('ActionRunner');

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed';

export type BaseActionState = BoltAction & {
  status: Exclude<ActionStatus, 'failed'>;
  abort: () => void;
  executed: boolean;
  abortSignal: AbortSignal;
  output?: string;
};

export type FailedActionState = BoltAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>;
    error: string;
    output?: string;
  };

export type ActionState = BaseActionState | FailedActionState;

type BaseActionUpdate = Partial<Pick<BaseActionState, 'status' | 'abort' | 'executed' | 'output'>>;

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string; output?: string });

type ActionsMap = MapStore<Record<string, ActionState>>;

export class ActionRunner {
  #webcontainer: Promise<WebContainer>;
  #currentExecutionPromise: Promise<void> = Promise.resolve();

  actions: ActionsMap = map({});

  /**
   * Resolves when all currently queued actions have finished executing.
   * Callers can await this to know when all actions are done.
   */
  get onAllActionsComplete(): Promise<void> {
    return this.#currentExecutionPromise;
  }

  /**
   * Returns all actions that failed, including their captured output.
   */
  getFailedActions(): FailedActionState[] {
    const allActions = this.actions.get();
    return Object.values(allActions).filter((action): action is FailedActionState => action.status === 'failed');
  }

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;
    logger.info('[INIT] ActionRunner initialized');
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const actions = this.actions.get();
    const action = actions[actionId];

    if (action) {
      logger.debug(`[ADD] Action ${actionId} already exists, skipping`);
      // action already added
      return;
    }

    logger.info(`[ADD] Adding new action ${actionId} of type: ${data.action.type}`);
    logger.debug(`[ADD] Action details:`, data.action);

    const abortController = new AbortController();

    this.actions.setKey(actionId, {
      ...data.action,
      status: 'pending',
      executed: false,
      abort: () => {
        logger.warn(`[ABORT] Aborting action ${actionId}`);
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
    });

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' });
    });
  }

  async runAction(data: ActionCallbackData) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];

    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }

    if (action.executed) {
      logger.debug(`[RUN] Action ${actionId} already executed, skipping`);
      return;
    }

    logger.info(`[RUN] Queueing action ${actionId} for execution`);
    this.#updateAction(actionId, { ...action, ...data.action, executed: true });

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId);
      })
      .catch((error) => {
        logger.error(`[RUN] Action ${actionId} failed:`, error);
      });
  }

  /**
   * Marks an action as completed without actually executing it.
   * Used in reload mode to skip non-essential shell commands.
   */
  skipAction(data: ActionCallbackData) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];

    if (!action) {
      return;
    }

    if (action.executed) {
      return;
    }

    logger.debug(`Skipping action ${actionId}`);
    this.#updateAction(actionId, { ...action, ...data.action, executed: true, status: 'complete' });
  }

  async #executeAction(actionId: string) {
    const action = this.actions.get()[actionId];

    logger.info(`[EXECUTE] Starting execution of action ${actionId} (type: ${action.type})`);
    this.#updateAction(actionId, { status: 'running' });

    try {
      switch (action.type) {
        case 'shell': {
          logger.debug(`[EXECUTE] Running shell action ${actionId}`);
          await this.#runShellAction(action, actionId);
          break;
        }
        case 'file': {
          logger.debug(`[EXECUTE] Running file action ${actionId}`);
          await this.#runFileAction(action);
          break;
        }
      }

      const finalStatus = action.abortSignal.aborted ? 'aborted' : 'complete';
      logger.info(`[EXECUTE] Action ${actionId} completed with status: ${finalStatus}`);
      this.#updateAction(actionId, { status: finalStatus });
    } catch (error) {
      logger.error(`[EXECUTE] Action ${actionId} failed:`, error);
      this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });

      // re-throw the error to be caught in the promise chain
      throw error;
    }
  }

  async #runShellAction(action: ActionState, actionId: string) {
    if (action.type !== 'shell') {
      unreachable('Expected shell action');
    }

    logger.info(`[SHELL] Executing shell command for action ${actionId}`);
    logger.debug(`[SHELL] Command: ${action.content}`);

    const webcontainer = await this.#webcontainer;

    logger.debug(`[SHELL] Spawning jsh process with npm_config_yes=true`);
    const process = await webcontainer.spawn('jsh', ['-c', action.content], {
      env: { npm_config_yes: true },
    });

    action.abortSignal.addEventListener('abort', () => {
      logger.warn(`[SHELL] Abort signal received, killing process for action ${actionId}`);
      process.kill();
    });

    // capture shell output for error reporting
    let outputText = '';

    process.output.pipeTo(
      new WritableStream({
        write(data) {
          logger.trace(`[SHELL OUTPUT] ${data}`);

          // keep last 4000 chars to avoid memory bloat
          outputText += data;

          if (outputText.length > 4000) {
            outputText = outputText.slice(-4000);
          }
        },
      }),
    );

    const exitCode = await process.exit;

    logger.info(`[SHELL] Process terminated with exit code ${exitCode} for action ${actionId}`);

    // store output on the action state
    this.#updateAction(actionId, { output: outputText });

    if (exitCode !== 0) {
      logger.error(`[SHELL] Command failed with exit code ${exitCode}`);
      logger.error(`[SHELL] Output: ${outputText}`);
      // mark as failed with the captured output
      this.#updateAction(actionId, {
        status: 'failed',
        error: `Process exited with code ${exitCode}`,
        output: outputText,
      });

      throw new Error(`Shell command failed with exit code ${exitCode}`);
    }
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action');
    }

    logger.info(`[FILE] Writing file: ${action.filePath}`);
    logger.debug(`[FILE] Content length: ${action.content.length} bytes`);

    const webcontainer = await this.#webcontainer;

    let folder = nodePath.dirname(action.filePath);

    // remove trailing slashes
    folder = folder.replace(/\/+$/g, '');

    if (folder !== '.') {
      try {
        logger.debug(`[FILE] Creating directory: ${folder}`);
        await webcontainer.fs.mkdir(folder, { recursive: true });
        logger.debug(`[FILE] Successfully created folder: ${folder}`);
      } catch (error) {
        logger.error(`[FILE] Failed to create folder ${folder}:`, error);
      }
    }

    try {
      await webcontainer.fs.writeFile(action.filePath, action.content);
      logger.info(`[FILE] Successfully written: ${action.filePath}`);
    } catch (error) {
      logger.error(`[FILE] Failed to write file ${action.filePath}:`, error);
    }
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get();
    const currentAction = actions[id];

    if ('status' in newState && newState.status !== currentAction?.status) {
      logger.debug(`[UPDATE] Action ${id} status: ${currentAction?.status} -> ${newState.status}`);
    }

    this.actions.setKey(id, { ...actions[id], ...newState });
  }
}
