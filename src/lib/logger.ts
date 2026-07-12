const PREFIX = '[question-drawer]';

export const logger = {
  info: (msg: string, ...args: unknown[]) => console.info(`${PREFIX} ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(`${PREFIX} ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`${PREFIX} ${msg}`, ...args),
};
