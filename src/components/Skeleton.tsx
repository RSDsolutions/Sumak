/**
 * Componentes Skeleton — placeholders animados durante carga.
 * Atiende UX-006: reemplaza spinners gigantes por estructura visible
 * que mantiene el layout estable y mejora la "perceived performance".
 */

interface SkeletonProps {
  className?: string;
  /** ancho fijo (Tailwind class o porcentaje) */
  width?: string;
  /** alto fijo (Tailwind class o pixels en clase) */
  height?: string;
  /** redondeo: 'sm' | 'md' | 'lg' | 'xl' | 'full' */
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const ROUND_MAP: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

export function Skeleton({ className = '', width, height, rounded = 'md' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-[#E5EBE6] ${ROUND_MAP[rounded]} ${width ?? 'w-full'} ${height ?? 'h-4'} ${className}`}
    />
  );
}

/** Fila simulada de tabla con N celdas. */
export function SkeletonTableRow({ cells = 5 }: { cells?: number }) {
  return (
    <tr className="border-b border-[#C8D8CB]">
      {Array.from({ length: cells }).map((_, i) => (
        <td key={i} className="px-5 py-3">
          <Skeleton height="h-3" width={i === 0 ? 'w-32' : 'w-20'} />
        </td>
      ))}
    </tr>
  );
}

/** Card simulada con cabecera + 3 líneas. */
export function SkeletonCard() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="bg-white border border-[#C8D8CB] rounded-2xl p-5"
    >
      <Skeleton className="mb-3" height="h-10" width="w-10" rounded="xl" />
      <Skeleton className="mb-2" height="h-3" width="w-24" />
      <Skeleton height="h-6" width="w-32" />
    </div>
  );
}

/** Bloque de N skeleton cards en grid. */
export function SkeletonCards({ count = 4, cols = 'lg:grid-cols-4' }: { count?: number; cols?: string }) {
  return (
    <div className={`grid grid-cols-2 ${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
