import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { logger } from './logger';
import { products as staticProducts, getPrecioDistribuidor as getPrecioStatic } from '../data';
import type { Product } from '../data';

/**
 * ProductsProvider — fuente unica de productos en runtime.
 *
 * - Al montar carga la tabla `productos` desde Supabase.
 * - Si la tabla esta vacia o la query falla, usa el catalogo estatico
 *   de src/data.ts como fallback (compat hacia atras + bootstrap).
 * - Aplica descuento (porcentaje) al PVP final cuando descuento_activo=true.
 * - Expone reload() para refrescar tras un cambio en /admin/productos.
 */

export interface ProductoExtended extends Product {
  /** id en DB (null si viene del fallback estatico). */
  dbId: string | null;
  /** Producto visible en tienda publica. true por defecto. */
  activo: boolean;
  /** Porcentaje de descuento aplicado sobre `pvp` (0..100). null si no hay. */
  descuentoPorcentaje: number | null;
  /** True si el descuento esta activo en este momento. */
  descuentoActivo: boolean;
  /** Etiqueta amigable del descuento ("Promo Sumak", etc). */
  descuentoLabel: string | null;
  /** Precio final al publico despues de aplicar descuento. */
  pvpFinal: number;
  /** Orden de listado (menor primero). */
  orden: number;
  /** ISO de la ultima actualizacion (solo si viene de DB). */
  updatedAt: string | null;
}

interface ProductsContextValue {
  /** Lista completa (incluye inactivos). Usa esto en admin. */
  all: ProductoExtended[];
  /** Lista visible al publico: activo=true. Esto es lo que usa la tienda. */
  products: ProductoExtended[];
  loading: boolean;
  /** True si los datos vienen de la DB; false si vienen del fallback estatico. */
  fromDb: boolean;
  /** Refresca desde la DB. */
  reload: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

interface DbRow {
  id: string;
  codigo: string;
  slug: string;
  nombre: string;
  categoria: string;
  categoria_key: string;
  pvp: number | string;
  precio_distribuidor: number | string | null;
  descripcion: string;
  imagen: string | null;
  tagline: string | null;
  presentacion: string | null;
  detalle_largo: string | null;
  modo_uso: string | null;
  precauciones: string | null;
  revista_pagina: string | null;
  beneficios: string[] | null;
  ingredientes: string[] | null;
  destacado: boolean;
  nuevo: boolean;
  bestseller: boolean;
  proximamente: boolean;
  activo: boolean;
  descuento_porcentaje: number | string | null;
  descuento_activo: boolean;
  descuento_label: string | null;
  orden: number;
  updated_at: string;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function fromDbRow(row: DbRow): ProductoExtended {
  const pvp = num(row.pvp);
  const descPct = numOrNull(row.descuento_porcentaje);
  const descActivo = !!row.descuento_activo && descPct !== null && descPct > 0;
  const pvpFinal = descActivo && descPct !== null
    ? Math.round(pvp * (1 - descPct / 100) * 100) / 100
    : pvp;
  return {
    dbId: row.id,
    codigo: row.codigo,
    slug: row.slug,
    nombre: row.nombre,
    categoria: row.categoria,
    categoriaKey: row.categoria_key,
    pvp,
    precioDistribuidor: numOrNull(row.precio_distribuidor) ?? undefined,
    descripcion: row.descripcion ?? '',
    imagen: row.imagen ?? undefined,
    tagline: row.tagline ?? undefined,
    presentacion: row.presentacion ?? undefined,
    detalleLargo: row.detalle_largo ?? undefined,
    modoUso: row.modo_uso ?? undefined,
    precauciones: row.precauciones ?? undefined,
    revistaPagina: row.revista_pagina ?? undefined,
    beneficios: Array.isArray(row.beneficios) ? row.beneficios : [],
    ingredientes: Array.isArray(row.ingredientes) ? row.ingredientes : [],
    destacado: !!row.destacado,
    nuevo: !!row.nuevo,
    bestseller: !!row.bestseller,
    proximamente: !!row.proximamente,
    activo: !!row.activo,
    descuentoPorcentaje: descPct,
    descuentoActivo: descActivo,
    descuentoLabel: row.descuento_label ?? null,
    pvpFinal,
    orden: row.orden ?? 0,
    updatedAt: row.updated_at,
  };
}

function fromStatic(p: Product, index: number): ProductoExtended {
  return {
    ...p,
    dbId: null,
    activo: true,
    descuentoPorcentaje: null,
    descuentoActivo: false,
    descuentoLabel: null,
    pvpFinal: p.pvp,
    orden: index,
    updatedAt: null,
  };
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [all, setAll] = useState<ProductoExtended[]>(() =>
    staticProducts.map((p, i) => fromStatic(p, i)),
  );
  const [loading, setLoading] = useState(true);
  const [fromDb, setFromDb] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('orden', { ascending: true })
        .order('nombre', { ascending: true });
      if (error) {
        logger.warn('ProductsProvider: error leyendo tabla productos, uso fallback', error);
        setAll(staticProducts.map((p, i) => fromStatic(p, i)));
        setFromDb(false);
        return;
      }
      const rows = (data ?? []) as DbRow[];
      if (rows.length === 0) {
        // Tabla vacia (aun no importada). Servimos el catalogo estatico.
        setAll(staticProducts.map((p, i) => fromStatic(p, i)));
        setFromDb(false);
        return;
      }
      setAll(rows.map(fromDbRow));
      setFromDb(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const products = useMemo(
    () => all.filter((p) => p.activo),
    [all],
  );

  const value: ProductsContextValue = useMemo(
    () => ({ all, products, loading, fromDb, reload: load }),
    [all, products, loading, fromDb, load],
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts(): ProductsContextValue {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts debe usarse dentro de ProductsProvider');
  return ctx;
}

/**
 * Calcula el precio de distribuidor usando la misma logica que
 * getPrecioDistribuidor del data.ts estatico, pero compatible con
 * ProductoExtended (que tiene precioDistribuidor como number|undefined).
 */
export function precioDistribuidorOf(p: Pick<ProductoExtended, 'pvp' | 'precioDistribuidor'>): number {
  return getPrecioStatic(p);
}
