import { logger } from '@/src/lib/logger';

export default defineContentScript({
  matches: ['*://claude.ai/*', '*://chatgpt.com/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    logger.info('content script loaded');
  },
});
