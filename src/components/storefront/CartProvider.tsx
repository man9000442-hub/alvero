"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartClientItem, Locale } from "@/types/database";

const STORAGE_KEY = "alvero_cart_v1";
const SESSION_KEY = "alvero_cart_session_v1";

interface CartContextValue {
  items: CartClientItem[];
  totalQuantity: number;
  subtotal: number;
  isDrawerOpen: boolean;
  isHydrated: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (item: CartClientItem) => { ok: boolean; error?: string };
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  replaceVariant: (oldVariantId: string, newItem: CartClientItem) => void;
  clearCart: () => void;
  syncWithServer: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function getOrCreateSessionToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(SESSION_KEY);
  if (!token) {
    token = `alv_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(SESSION_KEY, token);
  }
  return token;
}

export function CartProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const [items, setItems] = useState<CartClientItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const syncItemsToServer = useCallback(
    async (targetItems: CartClientItem[]) => {
      try {
        const sessionToken = getOrCreateSessionToken();
        if (!sessionToken) return;
        const res = await fetch("/api/cart/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken,
            locale,
            items: targetItems.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
            })),
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.synced && Array.isArray(json.items)) {
            setItems(json.items);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(json.items));
          }
        }
      } catch {
        // Offline or unconfigured DB fallback: keep local storage cart intact
      }
    },
    [locale],
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setItems(parsed);
            if (parsed.length > 0) {
              void syncItemsToServer(parsed);
            }
          }
        }
      } catch {
        // Ignore corrupt storage
      } finally {
        if (active) setIsHydrated(true);
      }
    });
    return () => {
      active = false;
    };
  }, [syncItemsToServer]);

  const persist = useCallback(
    (next: CartClientItem[]) => {
      setItems(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota issues
      }
      void syncItemsToServer(next);
    },
    [syncItemsToServer],
  );

  const addItem = useCallback(
    (newItem: CartClientItem): { ok: boolean; error?: string } => {
      if (newItem.stock_quantity <= 0) {
        return { ok: false, error: "OUT_OF_STOCK" };
      }

      const existing = items.find((i) => i.variantId === newItem.variantId);
      const nextQty = (existing?.quantity ?? 0) + newItem.quantity;

      if (nextQty > newItem.stock_quantity) {
        return { ok: false, error: "INSUFFICIENT_STOCK" };
      }

      const next = existing
        ? items.map((i) =>
            i.variantId === newItem.variantId
              ? { ...newItem, quantity: nextQty }
              : i,
          )
        : [...items, newItem];

      persist(next);
      setIsDrawerOpen(true);
      return { ok: true };
    },
    [items, persist],
  );

  const removeItem = useCallback(
    (variantId: string) => {
      const next = items.filter((i) => i.variantId !== variantId);
      persist(next);
    },
    [items, persist],
  );

  const updateQuantity = useCallback(
    (variantId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(variantId);
        return;
      }
      const next = items.map((i) =>
        i.variantId === variantId
          ? { ...i, quantity: Math.min(quantity, Math.max(1, i.stock_quantity)) }
          : i,
      );
      persist(next);
    },
    [items, persist, removeItem],
  );

  const replaceVariant = useCallback(
    (oldVariantId: string, newItem: CartClientItem) => {
      const withoutOld = items.filter((i) => i.variantId !== oldVariantId);
      const existingNew = withoutOld.find(
        (i) => i.variantId === newItem.variantId,
      );
      const next = existingNew
        ? withoutOld.map((i) =>
            i.variantId === newItem.variantId
              ? {
                  ...newItem,
                  quantity: Math.min(
                    i.quantity + newItem.quantity,
                    newItem.stock_quantity,
                  ),
                }
              : i,
          )
        : [...withoutOld, newItem];
      persist(next);
    },
    [items, persist],
  );

  const clearCart = useCallback(() => {
    persist([]);
  }, [persist]);

  const syncWithServer = useCallback(async () => {
    await syncItemsToServer(items);
  }, [items, syncItemsToServer]);

  const totalQuantity = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + Number(item.unit_price) * item.quantity,
        0,
      ),
    [items],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalQuantity,
        subtotal,
        isDrawerOpen,
        isHydrated,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        addItem,
        removeItem,
        updateQuantity,
        replaceVariant,
        clearCart,
        syncWithServer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
