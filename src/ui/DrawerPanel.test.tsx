import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeBrowser } from 'wxt/testing';
import { DrawerPanel } from './DrawerPanel';
import { drawerStorage } from '@/src/lib/storage';
import { createDrawerItem } from '@/src/lib/template';

describe('DrawerPanel', () => {
  beforeEach(() => fakeBrowser.reset());

  it('renders stored questions and fires onItemClick', async () => {
    await drawerStorage.add(createDrawerItem('side effect', 'claude'));
    const onItemClick = vi.fn();
    render(<DrawerPanel onItemClick={onItemClick} />);

    const item = await screen.findByText('side effect에 대해 자세히 설명해줘');
    await userEvent.click(item);
    expect(onItemClick).toHaveBeenCalledTimes(1);
  });

  it('removes an item when its delete button is clicked', async () => {
    await drawerStorage.add(createDrawerItem('side effect', 'claude'));
    render(<DrawerPanel onItemClick={() => {}} />);

    await screen.findByText('side effect에 대해 자세히 설명해줘');
    await userEvent.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() =>
      expect(screen.queryByText('side effect에 대해 자세히 설명해줘')).toBeNull(),
    );
  });
});
