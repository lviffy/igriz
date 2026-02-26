import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('WebContainer');

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => {
        logger.info('[BOOT] Starting WebContainer boot process...');
        logger.debug('[BOOT] Working directory:', WORK_DIR_NAME);
        return WebContainer.boot({ workdirName: WORK_DIR_NAME });
      })
      .then((webcontainer) => {
        webcontainerContext.loaded = true;
        logger.info('[BOOT] WebContainer successfully booted and loaded');
        logger.debug('[BOOT] WebContainer instance:', webcontainer);
        return webcontainer;
      })
      .catch((error) => {
        logger.error('[BOOT] Failed to boot WebContainer');
        throw error;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
    logger.debug('[HMR] WebContainer instance stored in HMR data');
  }
}
