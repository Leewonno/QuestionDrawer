import { logger } from './logger';

export const DRAWER_WIDTH_PX = 320;
export const DOCK_CLASS = 'qd-docked';

const STYLE_ID = 'question-drawer-dock';
const CSS = `html.${DOCK_CLASS} { margin-right: ${DRAWER_WIDTH_PX}px !important; }`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}

/**
 * Pushes the host page aside by margin so the docked drawer doesn't cover it.
 * If this fails (host page changed, no <head>, CSP), the panel still works as a
 * fixed overlay — only the layout overlaps.
 */
export function applyDock(open: boolean): void {
  try {
    ensureStyle();
    document.documentElement.classList.toggle(DOCK_CLASS, open);
  } catch (error) {
    logger.warn('failed to dock the drawer, falling back to overlay', error);
  }
}

export function cleanupDock(): void {
  document.documentElement.classList.remove(DOCK_CLASS);
  document.getElementById(STYLE_ID)?.remove();
}
