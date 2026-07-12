import { useState } from 'react';
import { useDrawerItems } from './useDrawerItems';
import type { DrawerItem } from '@/src/lib/schema';

interface Props {
  onItemClick: (item: DrawerItem) => void;
}

export function DrawerPanel({ onItemClick }: Props) {
  const { items, remove } = useDrawerItems();
  const [open, setOpen] = useState(true);

  return (
    <div className="fixed right-0 top-1/4 z-[2147483647] w-72 font-sans">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-l-md bg-neutral-800 px-3 py-1 text-sm text-white"
      >
        서랍 {items.length > 0 && `(${items.length})`}
      </button>
      {open && (
        <div className="max-h-[60vh] overflow-y-auto rounded-l-md bg-white p-2 shadow-lg dark:bg-neutral-900">
          {items.length === 0 && (
            <p className="p-3 text-sm text-neutral-500">담긴 질문이 없어요.</p>
          )}
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <button
                  onClick={() => onItemClick(item)}
                  className="flex-1 text-left text-sm text-neutral-800 dark:text-neutral-100"
                >
                  {item.question}
                </button>
                <button
                  aria-label="삭제"
                  onClick={() => remove(item.id)}
                  className="text-neutral-400 hover:text-red-500"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
