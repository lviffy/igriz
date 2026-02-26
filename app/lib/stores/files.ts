import type { PathWatcherEvent, WebContainer } from '@webcontainer/api';
import { getEncoding } from 'istextorbinary';
import { map, type MapStore } from 'nanostores';
import { Buffer } from 'node:buffer';
import * as nodePath from 'node:path';
import { bufferWatchEvents } from '~/utils/buffer';
import { WORK_DIR } from '~/utils/constants';
import { computeFileModifications } from '~/utils/diff';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';

const logger = createScopedLogger('FilesStore');

const utf8TextDecoder = new TextDecoder('utf8', { fatal: true });

export interface File {
  type: 'file';
  content: string;
  isBinary: boolean;
}

export interface Folder {
  type: 'folder';
}

type Dirent = File | Folder;

export type FileMap = Record<string, Dirent | undefined>;

export class FilesStore {
  #webcontainer: Promise<WebContainer>;

  /**
   * Tracks the number of files without folders.
   */
  #size = 0;

  /**
   * @note Keeps track all modified files with their original content since the last user message.
   * Needs to be reset when the user sends another message and all changes have to be submitted
   * for the model to be aware of the changes.
   */
  #modifiedFiles: Map<string, string> = import.meta.hot?.data.modifiedFiles ?? new Map();

  /**
   * Map of files that matches the state of WebContainer.
   */
  files: MapStore<FileMap> = import.meta.hot?.data.files ?? map({});

  get filesCount() {
    return this.#size;
  }

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;

    logger.trace('[INIT] FilesStore initialized');

    if (import.meta.hot) {
      import.meta.hot.data.files = this.files;
      import.meta.hot.data.modifiedFiles = this.#modifiedFiles;
    }

    this.#init();
  }

  getFile(filePath: string) {
    const dirent = this.files.get()[filePath];

    if (dirent?.type !== 'file') {
      logger.debug(`[GET] File not found or is a folder: ${filePath}`);
      return undefined;
    }

    logger.trace(`[GET] Retrieved file: ${filePath}`);
    return dirent;
  }

  getFileModifications() {
    logger.debug(`[MODIFICATIONS] Getting file modifications (${this.#modifiedFiles.size} modified files)`);
    return computeFileModifications(this.files.get(), this.#modifiedFiles);
  }

  resetFileModifications() {
    logger.info(`[MODIFICATIONS] Resetting ${this.#modifiedFiles.size} modified files`);
    this.#modifiedFiles.clear();
  }

  async saveFile(filePath: string, content: string) {
    logger.info(`[SAVE] Saving file: ${filePath}`);
    logger.debug(`[SAVE] Content length: ${content.length} bytes`);

    const webcontainer = await this.#webcontainer;

    try {
      const relativePath = nodePath.relative(webcontainer.workdir, filePath);

      if (!relativePath) {
        throw new Error(`EINVAL: invalid file path, write '${relativePath}'`);
      }

      const oldContent = this.getFile(filePath)?.content;

      if (!oldContent) {
        unreachable('Expected content to be defined');
      }

      logger.debug(`[SAVE] Writing to relative path: ${relativePath}`);
      await webcontainer.fs.writeFile(relativePath, content);

      if (!this.#modifiedFiles.has(filePath)) {
        logger.debug(`[SAVE] Tracking file modification: ${filePath}`);
        this.#modifiedFiles.set(filePath, oldContent);
      }

      // we immediately update the file and don't rely on the `change` event coming from the watcher
      this.files.setKey(filePath, { type: 'file', content, isBinary: false });

      logger.info(`[SAVE] File successfully saved: ${filePath}`);
    } catch (error) {
      logger.error(`[SAVE] Failed to update file ${filePath}:`, error);

      throw error;
    }
  }

  async #init() {
    logger.info('[INIT] Initializing file watcher...');
    const webcontainer = await this.#webcontainer;

    logger.debug(`[INIT] Setting up path watcher for: ${WORK_DIR}/**`);
    webcontainer.internal.watchPaths(
      { include: [`${WORK_DIR}/**`], exclude: ['**/node_modules', '.git'], includeContent: true },
      bufferWatchEvents(100, this.#processEventBuffer.bind(this)),
    );
    logger.info('[INIT] File watcher initialized');
  }

  #processEventBuffer(events: Array<[events: PathWatcherEvent[]]>) {
    const watchEvents = events.flat(2);

    logger.debug(`[WATCHER] Processing ${watchEvents.length} file system events`);

    for (const { type, path, buffer } of watchEvents) {
      // remove any trailing slashes
      const sanitizedPath = path.replace(/\/+$/g, '');

      logger.trace(`[WATCHER] Event: ${type} - ${sanitizedPath}`);

      switch (type) {
        case 'add_dir': {
          logger.debug(`[WATCHER] Adding directory: ${sanitizedPath}`);
          // we intentionally add a trailing slash so we can distinguish files from folders in the file tree
          this.files.setKey(sanitizedPath, { type: 'folder' });
          break;
        }
        case 'remove_dir': {
          logger.debug(`[WATCHER] Removing directory and contents: ${sanitizedPath}`);
          this.files.setKey(sanitizedPath, undefined);

          for (const [direntPath] of Object.entries(this.files)) {
            if (direntPath.startsWith(sanitizedPath)) {
              logger.trace(`[WATCHER] Removing child path: ${direntPath}`);
              this.files.setKey(direntPath, undefined);
            }
          }

          break;
        }
        case 'add_file':
        case 'change': {
          if (type === 'add_file') {
            this.#size++;
            logger.debug(`[WATCHER] Adding new file: ${sanitizedPath} (total files: ${this.#size})`);
          } else {
            logger.debug(`[WATCHER] File changed: ${sanitizedPath}`);
          }

          let content = '';

          /**
           * @note This check is purely for the editor. The way we detect this is not
           * bullet-proof and it's a best guess so there might be false-positives.
           * The reason we do this is because we don't want to display binary files
           * in the editor nor allow to edit them.
           */
          const isBinary = isBinaryFile(buffer);

          if (!isBinary) {
            content = this.#decodeFileContent(buffer);
            logger.trace(`[WATCHER] Decoded text file content (${content.length} bytes)`);
          } else {
            logger.trace(`[WATCHER] Binary file detected: ${sanitizedPath}`);
          }

          this.files.setKey(sanitizedPath, { type: 'file', content, isBinary });

          break;
        }
        case 'remove_file': {
          this.#size--;
          logger.debug(`[WATCHER] Removing file: ${sanitizedPath} (total files: ${this.#size})`);
          this.files.setKey(sanitizedPath, undefined);
          break;
        }
        case 'update_directory': {
          logger.trace(`[WATCHER] Directory update event (ignored): ${sanitizedPath}`);
          // we don't care about these events
          break;
        }
      }
    }
  }

  #decodeFileContent(buffer?: Uint8Array) {
    if (!buffer || buffer.byteLength === 0) {
      return '';
    }

    try {
      return utf8TextDecoder.decode(buffer);
    } catch (error) {
      logger.error('[DECODE] Failed to decode file content as UTF-8:', error);
      return '';
    }
  }
}

function isBinaryFile(buffer: Uint8Array | undefined) {
  if (buffer === undefined) {
    return false;
  }

  return getEncoding(convertToBuffer(buffer), { chunkLength: 100 }) === 'binary';
}

/**
 * Converts a `Uint8Array` into a Node.js `Buffer` by copying the prototype.
 * The goal is to  avoid expensive copies. It does create a new typed array
 * but that's generally cheap as long as it uses the same underlying
 * array buffer.
 */
function convertToBuffer(view: Uint8Array): Buffer {
  const buffer = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);

  Object.setPrototypeOf(buffer, Buffer.prototype);

  return buffer as Buffer;
}
