import { useState } from 'react';
import { displayName } from '../lib/profile';
import type { Profile } from '../lib/types';

type AvatarProfile = Pick<Profile, 'avatar_url' | 'nombre_completo' | 'username' | 'codigo_distribuidor'>;

function initials(p: AvatarProfile | null | undefined): string {
  const name = displayName(p);
  if (name === '—') return '?';
  const parts = name.replace('@', '').trim().split(/\s+/);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

/** Círculo de foto de perfil, con fallback a iniciales si no hay avatar_url o falla la carga. */
export default function Avatar({
  profile,
  size = 40,
  className = '',
}: {
  profile: AvatarProfile | null | undefined;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!profile?.avatar_url && !failed;

  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      className={`shrink-0 rounded-full overflow-hidden flex items-center justify-center font-bold bg-[#1A4E26]/10 text-[#1A4E26] ${className}`}
    >
      {showImage ? (
        <img
          src={profile!.avatar_url!}
          alt={displayName(profile)}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials(profile)}</span>
      )}
    </div>
  );
}
