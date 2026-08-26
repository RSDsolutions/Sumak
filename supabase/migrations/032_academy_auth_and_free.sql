-- ============================================================
-- SUMAK — Migration 032
-- Academia: Registro propio (sin referido/paquete/voucher)
-- y soporte para cursos gratuitos.
-- ============================================================

-- ── 1. Función: crear profile de estudiante desde academia ──────────────────
-- Se llama justo después de auth.signUp en el frontend.
-- No requiere aprobación: el usuario queda activo inmediatamente.
create or replace function public.create_academy_profile(
  p_nombre_completo text,
  p_cedula          text,
  p_telefono        text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_code    text;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = 'P0001';
  end if;

  -- Leer el email del usuario recién registrado
  select email into v_email from auth.users where id = v_user_id;

  -- Generar código de distribuidor único para el estudiante
  v_code := 'ACE-' || upper(substring(md5(v_user_id::text), 1, 8));

  -- Insertar profile. Si ya existe no hace nada (idempotente).
  insert into public.profiles (
    id,
    codigo_distribuidor,
    nombre_completo,
    cedula,
    email,
    telefono,
    rol,
    estado,
    fecha_aprobacion
  )
  values (
    v_user_id,
    v_code,
    trim(p_nombre_completo),
    trim(p_cedula),
    v_email,
    trim(p_telefono),
    'distribuidor',
    'activo',
    now()
  )
  on conflict (id) do nothing;

  return jsonb_build_object('ok', true, 'codigo', v_code);
end;
$$;

-- Permitir que usuarios autenticados la llamen
grant execute on function public.create_academy_profile(text, text, text)
  to authenticated;

-- ── 2. Función: inscribirse gratis a un curso ──────────────────────────────
create or replace function public.enroll_free_course(
  p_course_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price   numeric;
  v_status  text;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = 'P0001';
  end if;

  -- Verificar que el curso existe, está publicado y es gratuito
  select coalesce(price, 0), status
    into v_price, v_status
    from academy_courses
   where id = p_course_id;

  if not found then
    raise exception 'Curso no encontrado' using errcode = 'P0002';
  end if;

  if v_status <> 'published' then
    raise exception 'Curso no disponible' using errcode = 'P0003';
  end if;

  if v_price > 0 then
    raise exception 'Este curso requiere pago' using errcode = 'P0004';
  end if;

  -- Inscribir si no está ya inscrito
  insert into academy_enrollments (user_id, course_id, status)
  values (v_user_id, p_course_id, 'active')
  on conflict (user_id, course_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.enroll_free_course(uuid)
  to authenticated;

-- ── 3. Columna price en academy_courses (si no existe) ────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'academy_courses'
      and column_name  = 'price'
  ) then
    alter table public.academy_courses
      add column price numeric(10,2) default 0 not null;
  end if;
end;
$$;
