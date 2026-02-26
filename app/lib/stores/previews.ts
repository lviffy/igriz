import type { WebContainer } from '@webcontainer/api';
import { atom } from 'nanostores';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('PreviewsStore');

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

export class PreviewsStore {
  #availablePreviews = new Map<number, PreviewInfo>();
  #webcontainer: Promise<WebContainer>;

  previews = atom<PreviewInfo[]>([]);

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;

    logger.trace('[INIT] PreviewsStore initialized');

    this.#init();
  }

  async #init() {
    logger.info('[INIT] Setting up port listener...');
    const webcontainer = await this.#webcontainer;

    webcontainer.on('port', (port, type, url) => {
      logger.info(`[PORT] Port event - Port: ${port}, Type: ${type}, URL: ${url}`);
      
      let previewInfo = this.#availablePreviews.get(port);

      if (type === 'close' && previewInfo) {
        logger.info(`[PORT] Closing preview on port ${port}`);
        this.#availablePreviews.delete(port);
        this.previews.set(this.previews.get().filter((preview) => preview.port !== port));

        return;
      }

      const previews = this.previews.get();

      if (!previewInfo) {
        logger.info(`[PORT] Creating new preview - Port: ${port}, Ready: ${type === 'open'}`);
        previewInfo = { port, ready: type === 'open', baseUrl: url };
        this.#availablePreviews.set(port, previewInfo);
        previews.push(previewInfo);
      }

      if (previewInfo.ready !== (type === 'open')) {
        logger.debug(`[PORT] Preview ready state changed - Port: ${port}, Ready: ${type === 'open'}`);
      }

      previewInfo.ready = type === 'open';
      previewInfo.baseUrl = url;

      this.previews.set([...previews]);
      logger.debug(`[PORT] Total active previews: ${this.previews.get().length}`);
    });
    
    logger.info('[INIT] Port listener ready');
  }
}
