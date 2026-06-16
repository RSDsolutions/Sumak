import type { Profile } from './types';

type ProfileLike = Pick<Profile, 'nombre_completo' | 'username' | 'codigo_distribuidor'>;

/**
 * Nombre para mostrar al usuario. Cae en orden:
 * 1. nombre_completo si existe
 * 2. @username si existe
 * 3. codigo_distribuidor si existe
 * 4. guion como ultimo recurso
 *
 * Importante: profiles sembrados via bulk seed (mig 023) pueden no tener
 * nombre_completo ni cedula hasta que el usuario complete su perfil.
 */
export function displayName(p: ProfileLike | null | undefined): string {
  if (!p) return '—';
  if (p.nombre_completo && p.nombre_completo.trim()) return p.nombre_completo;
  if (p.username && p.username.trim()) return `@${p.username}`;
  if (p.codigo_distribuidor) return p.codigo_distribuidor;
  return '—';
}

/** Versión segura para usar en operaciones de string (lowercase, includes, etc). */
export function displayNameLower(p: ProfileLike | null | undefined): string {
  return displayName(p).toLowerCase();
}

/** True si al perfil le faltan los datos personales mínimos (nombre y cédula). */
export function isProfileIncomplete(
  p: Pick<Profile, 'nombre_completo' | 'cedula'> | null | undefined,
): boolean {
  if (!p) return true;
  return !p.nombre_completo || !p.cedula;
}
