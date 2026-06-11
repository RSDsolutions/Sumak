/**
 * Catálogo central de etiquetas y clases de color para los estados
 * del dominio (COD-001).
 *
 * Antes había ~7 archivos con copias de `estadoBadge()` y `ESTADO_LABELS`
 * con pequeñas variaciones inconsistentes. Aquí está la fuente única.
 *
 * Cada par export expone:
 *   - LABELS: cómo se ve para el usuario humano
 *   - BADGE_CLASS: clases Tailwind para el chip de estado
 *
 * Las páginas viejas pueden migrar paulatinamente; no es necesario
 * reescribirlas todas de una vez.
 */

import type { EstadoPedido, EstadoComision, EstadoAfiliacion, TipoComision } from './types';

// ─────────────────────────────────────────────────────────────
// Pedidos
// ─────────────────────────────────────────────────────────────

export const ESTADO_PEDIDO_LABELS: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const ESTADO_PEDIDO_BADGE: Record<EstadoPedido, string> = {
  pendiente: 'bg-amber-50 text-amber-600 border border-amber-200',
  procesando: 'bg-blue-50 text-blue-600 border border-blue-200',
  enviado: 'bg-purple-50 text-purple-600 border border-purple-200',
  entregado: 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30',
  cancelado: 'bg-red-50 text-red-600 border border-red-200',
};

export function pedidoBadgeClass(estado: string): string {
  return ESTADO_PEDIDO_BADGE[estado as EstadoPedido] ?? 'bg-[#F4F7F5] text-[#6B7280]';
}

export function pedidoLabel(estado: string): string {
  return ESTADO_PEDIDO_LABELS[estado as EstadoPedido] ?? estado;
}

// ─────────────────────────────────────────────────────────────
// Comisiones
// ─────────────────────────────────────────────────────────────

export const ESTADO_COMISION_LABELS: Record<EstadoComision, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
};

export const ESTADO_COMISION_BADGE: Record<EstadoComision, string> = {
  pendiente: 'bg-amber-50 text-amber-600 border border-amber-200',
  pagado: 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30',
  cancelado: 'bg-red-50 text-red-600 border border-red-200',
};

export const TIPO_COMISION_LABELS: Record<TipoComision, string> = {
  afiliacion: 'Referido directo',
  nivel: 'Por nivel',
  binaria: 'Binaria',
};

export const TIPO_COMISION_BADGE: Record<TipoComision, string> = {
  afiliacion: 'bg-blue-50 text-blue-600',
  binaria: 'bg-purple-50 text-purple-600',
  nivel: 'bg-[#D4AF37]/10 text-[#D4AF37]',
};

export function comisionBadgeClass(estado: string): string {
  return ESTADO_COMISION_BADGE[estado as EstadoComision] ?? '';
}

export function comisionLabel(estado: string): string {
  return ESTADO_COMISION_LABELS[estado as EstadoComision] ?? estado;
}

export function tipoComisionBadgeClass(tipo: string): string {
  return TIPO_COMISION_BADGE[tipo as TipoComision] ?? 'bg-[#F4F7F5] text-[#6B7280]';
}

export function tipoComisionLabel(tipo: string): string {
  return TIPO_COMISION_LABELS[tipo as TipoComision] ?? tipo;
}

// ─────────────────────────────────────────────────────────────
// Afiliaciones
// ─────────────────────────────────────────────────────────────

export const ESTADO_AFILIACION_LABELS: Record<EstadoAfiliacion, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

export const ESTADO_AFILIACION_BADGE: Record<EstadoAfiliacion, string> = {
  pendiente: 'bg-amber-50 text-amber-600 border border-amber-200',
  aprobada: 'bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30',
  rechazada: 'bg-red-50 text-red-600 border border-red-200',
};

export function afiliacionBadgeClass(estado: string): string {
  return ESTADO_AFILIACION_BADGE[estado as EstadoAfiliacion] ?? 'bg-[#F4F7F5] text-[#6B7280]';
}

export function afiliacionLabel(estado: string): string {
  return ESTADO_AFILIACION_LABELS[estado as EstadoAfiliacion] ?? estado;
}
