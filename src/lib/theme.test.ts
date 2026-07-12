import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { detectHostTheme, useHostTheme } from './theme';

function makeRoot(setup: (el: HTMLElement) => void): HTMLElement {
  const el = document.createElement('html');
  setup(el);
  return el;
}

describe('detectHostTheme', () => {
  it('reads the dark class', () => {
    expect(detectHostTheme(makeRoot((el) => el.classList.add('dark')))).toBe('dark');
  });

  it('reads the light class', () => {
    expect(detectHostTheme(makeRoot((el) => el.classList.add('light')))).toBe('light');
  });

  it('reads data-theme', () => {
    expect(detectHostTheme(makeRoot((el) => el.setAttribute('data-theme', 'dark')))).toBe('dark');
  });

  it('reads data-mode', () => {
    expect(detectHostTheme(makeRoot((el) => el.setAttribute('data-mode', 'dark')))).toBe('dark');
  });

  it('falls back to light when no marker is present and matchMedia is unavailable', () => {
    expect(detectHostTheme(makeRoot(() => {}))).toBe('light');
  });
});

describe('useHostTheme', () => {
  afterEach(() => {
    document.documentElement.className = '';
  });

  it('tracks the host page toggling its theme', async () => {
    const { result } = renderHook(() => useHostTheme());
    expect(result.current).toBe('light');

    await act(async () => {
      document.documentElement.classList.add('dark');
      // MutationObserver callbacks are delivered as microtasks.
      await Promise.resolve();
    });

    expect(result.current).toBe('dark');
  });
});
