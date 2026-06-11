import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface PackSelection {
  codigo: string;
  nombre: string;
  cantidad: number;
}

export interface CartItem {
  codigo: string;
  nombre: string;
  pvp: number;
  precio: number;
  cantidad: number;
  imagen?: string;
  // Para items tipo paquete (PKG-*): productos elegidos por el usuario
  // que conforman el contenido del pack. Solo informativos: el precio del
  // pack es fijo y no depende de las selecciones.
  packSelections?: PackSelection[];
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'cantidad'>, qty?: number) => void;
  removeItem: (codigo: string) => void;
  setQty: (codigo: string, qty: number) => void;
  clear: () => void;
  totalItems: number;
  totalUnits: number;
  subtotal: number;
  savings: number;
  totalPVP: number;
  puntos: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'sumak_cart_v1';

function readStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => typeof p?.codigo === 'string' && typeof p?.cantidad === 'number');
  } catch {
    return [];
  }
}

function writeStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStorage());

  useEffect(() => {
    writeStorage(items);
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'cantidad'>, qty: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.codigo === item.codigo);
      if (existing) {
        // Para packs: si el usuario reconfigura el pack agregándolo otra vez,
        // reemplazamos las selecciones y mantenemos la cantidad existente +1.
        if (item.packSelections) {
          return prev.map((i) =>
            i.codigo === item.codigo
              ? { ...i, packSelections: item.packSelections, cantidad: i.cantidad + qty }
              : i,
          );
        }
        return prev.map((i) => i.codigo === item.codigo ? { ...i, cantidad: i.cantidad + qty } : i);
      }
      return [...prev, { ...item, cantidad: Math.max(1, qty) }];
    });
  }, []);

  const removeItem = useCallback((codigo: string) => {
    setItems((prev) => prev.filter((i) => i.codigo !== codigo));
  }, []);

  const setQty = useCallback((codigo: string, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((i) => i.codigo !== codigo);
      return prev.map((i) => i.codigo === codigo ? { ...i, cantidad: qty } : i);
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalItems = items.length;
  const totalUnits = items.reduce((s, i) => s + i.cantidad, 0);
  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const totalPVP = items.reduce((s, i) => s + i.pvp * i.cantidad, 0);
  const savings = totalPVP - subtotal;
  const puntos = items.reduce((s, i) => s + Math.round(i.precio * i.cantidad), 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, setQty, clear,
      totalItems, totalUnits, subtotal, savings, totalPVP, puntos,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
