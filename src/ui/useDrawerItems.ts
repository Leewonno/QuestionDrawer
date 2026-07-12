import { useEffect, useState } from 'react';
import { drawerStorage } from '@/src/lib/storage';
import type { DrawerItem } from '@/src/lib/schema';

export function useDrawerItems() {
  const [items, setItems] = useState<DrawerItem[]>([]);

  useEffect(() => {
    let active = true;
    drawerStorage.getAll().then((loaded) => {
      if (active) setItems(loaded);
    });
    const unwatch = drawerStorage.watch(setItems);
    return () => {
      active = false;
      unwatch();
    };
  }, []);

  const remove = (id: string) => {
    void drawerStorage.remove(id);
  };

  return { items, remove };
}
