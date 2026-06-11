-- ============================================================
-- SUMAK — Migration 007
-- Habilita múltiples frontales (posicion = NULL) bajo CUALQUIER
-- distribuidor, no solo el admin.
--
-- Antes: solo el admin podia tener N hijos directos sin posicion
-- (frontales). Los demas distribuidores eran obligados a usar el
-- arbol binario estricto (izquierda / derecha).
--
-- Ahora: cualquier patrocinador puede abrir un "frontal nuevo"
-- bajo su nodo. Esto es util para distribuidores que crecen mucho
-- en numero de directos y quieren organizarlos sin gastar el cupo
-- binario.
--
-- El indice unico parcial idx_red_binaria_padre_posicion ya admite
-- esto (filtra por posicion IS NOT NULL), asi que solo hay que
-- relajar el trigger de validacion.
-- ============================================================
-- Idempotente.
-- ============================================================

create or replace function public.check_binary_position()
returns trigger as $$
begin
  -- Sin padre: nodo raiz. Solo el admin deberia llegar aqui pero
  -- no validamos rol aqui (lo controla el codigo de alta).
  if new.padre_id is null then
    return new;
  end if;

  -- Si la posicion es NULL: es un frontal nuevo bajo el padre.
  -- Permitido para CUALQUIER padre. El indice parcial unique no
  -- aplica (su WHERE clause excluye NULLs), asi que pueden haber
  -- N frontales bajo el mismo padre sin chocar.
  if new.posicion is null then
    return new;
  end if;

  -- Si la posicion es izquierda/derecha: chequear que no este
  -- ocupada. (El indice unique tambien lo enforza, pero damos
  -- mensaje amable).
  if exists (
    select 1 from public.red_binaria
    where padre_id = new.padre_id
      and posicion = new.posicion
      and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'La posicion % ya esta ocupada bajo este distribuidor.', new.posicion;
  end if;

  return new;
end;
$$ language plpgsql;

-- El trigger ya existe, no necesita recrearse. La funcion se actualizo arriba.

comment on column public.red_binaria.posicion is
  'NULL = frontal (cualquier distribuidor puede tener N hijos frontales). izquierda/derecha = posicion binaria estricta, una sola por padre.';

-- ============================================================
-- VERIFICACION sugerida:
--   - Intenta insertar dos rows con posicion=NULL bajo el mismo
--     distribuidor no-admin: deberia funcionar.
--   - Intenta insertar dos rows con posicion='izquierda' bajo el
--     mismo padre: deberia fallar con mensaje amable.
-- ============================================================
