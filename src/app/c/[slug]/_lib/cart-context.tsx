'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface CartItem {
  productId: string;
  name: string;
  imageUrl: string | null;
  price: string | null;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  removeMany: (productIds: string[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(slug: string) {
  return `pampa-catalog-cart:${slug}`;
}

function CartProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(storageKey(slug));
        if (raw) setItems(JSON.parse(raw) as CartItem[]);
      } catch {
        // Corrupted or inaccessible storage — start with an empty cart.
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [slug]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey(slug), JSON.stringify(items));
    } catch {
      // Storage full/blocked — cart just won't persist across reloads.
    }
  }, [items, slug, hydrated]);

  const add = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((row) => row.productId === item.productId);
      if (existing) {
        return current.map((row) =>
          row.productId === item.productId
            ? { ...row, quantity: row.quantity + quantity }
            : row,
        );
      }
      return [...current, { ...item, quantity }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((row) => row.productId !== productId)
        : current.map((row) => (row.productId === productId ? { ...row, quantity } : row)),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((current) => current.filter((row) => row.productId !== productId));
  }, []);

  const removeMany = useCallback((productIds: string[]) => {
    setItems((current) => current.filter((row) => !productIds.includes(row.productId)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, count, add, setQuantity, remove, clear, removeMany }),
    [items, count, add, setQuantity, remove, clear, removeMany],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}

export { CartProvider, useCart };
