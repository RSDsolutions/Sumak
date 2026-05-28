export type PaqueteKey = 'basico' | 'emprendedor' | 'lider';
export type EstadoAfiliacion = 'pendiente' | 'aprobada' | 'rechazada';
export type EstadoPedido = 'pendiente' | 'procesando' | 'enviado' | 'entregado' | 'cancelado';
export type EstadoComision = 'pendiente' | 'pagado' | 'cancelado';
export type RolUsuario = 'distribuidor' | 'admin';
export type EstadoDistribuidor = 'activo' | 'suspendido';
export type PosicionBinaria = 'izquierda' | 'derecha';
export type TipoComision = 'afiliacion' | 'binaria' | 'nivel';
export type TipoPrecio = 'pvp' | 'distribuidor';

export interface Profile {
  id: string;
  codigo_distribuidor: string | null;
  nombre_completo: string;
  cedula: string;
  email: string;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  codigo_patrocinador: string | null;
  patrocinador_id: string | null;
  paquete: PaqueteKey | null;
  puntos: number;
  estado: EstadoDistribuidor;
  rol: RolUsuario;
  avatar_url: string | null;
  fecha_registro: string;
  fecha_aprobacion: string | null;
}

export interface Afiliacion {
  id: string;
  nombre_completo: string;
  cedula: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  codigo_patrocinador: string | null;
  paquete_seleccionado: PaqueteKey;
  estado: EstadoAfiliacion;
  doc_cedula_frente: string | null;
  doc_cedula_reverso: string | null;
  doc_planilla: string | null;
  doc_voucher: string | null;
  notas_admin: string | null;
  created_at: string;
  updated_at: string;
}

export interface NodoBinario {
  id: string;
  distribuidor_id: string;
  padre_id: string | null;
  posicion: PosicionBinaria | null;
  nivel: number;
  created_at: string;
  // joined
  profile?: Profile;
  children?: NodoBinario[];
}

export interface Pedido {
  id: string;
  distribuidor_id: string;
  estado: EstadoPedido;
  tipo_precio: TipoPrecio;
  total: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
  // joined
  profile?: Profile;
  items?: PedidoItem[];
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  producto_codigo: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Comision {
  id: string;
  beneficiario_id: string;
  origen_id: string | null;
  tipo: TipoComision;
  nivel_red: number | null;
  monto: number;
  estado: EstadoComision;
  descripcion: string | null;
  created_at: string;
  pagado_at: string | null;
  // joined
  beneficiario?: Profile;
  origen?: Profile;
}

export interface VolumenBinario {
  id: string;
  distribuidor_id: string;
  mes: string;
  volumen_izquierda: number;
  volumen_derecha: number;
  volumen_pareado: number;
  comision_calculada: number;
  procesado: boolean;
  created_at: string;
}

export interface RangoHistoria {
  id: string;
  distribuidor_id: string;
  rango: string;
  tramo: '1' | '2';
  bono_monto: number | null;
  bono_pagado: boolean;
  fecha_alcanzado: string;
}
