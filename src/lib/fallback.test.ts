import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard, showToast } from './fallback';

describe('copyToClipboard', () => {
  it('returns true when clipboard write succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyToClipboard('hi')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hi');
  });

  it('returns false when clipboard write throws', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    expect(await copyToClipboard('hi')).toBe(false);
  });
});

describe('showToast', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  it('adds a toast element to the body', () => {
    showToast('hello');
    expect(document.body.querySelector('[data-qd-toast]')?.textContent).toBe('hello');
  });
});
