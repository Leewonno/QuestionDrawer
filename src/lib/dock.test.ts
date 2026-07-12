import { describe, it, expect, afterEach } from 'vitest';
import { applyDock, cleanupDock, DOCK_CLASS, DRAWER_WIDTH_PX } from './dock';

const STYLE_ID = 'question-drawer-dock';

afterEach(() => cleanupDock());

describe('applyDock', () => {
  it('injects the stylesheet once and marks html when open', () => {
    applyDock(true);
    applyDock(true);

    const styles = document.querySelectorAll(`#${STYLE_ID}`);
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain(`margin-right: ${DRAWER_WIDTH_PX}px`);
    expect(document.documentElement.classList.contains(DOCK_CLASS)).toBe(true);
  });

  it('unmarks html when closed but leaves the stylesheet in place', () => {
    applyDock(true);
    applyDock(false);

    expect(document.documentElement.classList.contains(DOCK_CLASS)).toBe(false);
    expect(document.getElementById(STYLE_ID)).not.toBeNull();
  });
});

describe('cleanupDock', () => {
  it('removes both the class and the stylesheet', () => {
    applyDock(true);
    cleanupDock();

    expect(document.documentElement.classList.contains(DOCK_CLASS)).toBe(false);
    expect(document.getElementById(STYLE_ID)).toBeNull();
  });
});
