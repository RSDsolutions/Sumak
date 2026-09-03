-- ============================================================
-- SUMAK — Seed del usuario "operaciones" inicial (007b)
-- ============================================================
-- ANTES DE EJECUTAR:
--   1. Cambia el email, el nombre completo y la contraseña abajo
--      si quieres otros valores.
--   2. Verifica que migración 007 ya está aplicada.
--   3. Esta operación es IDEMPOTENTE: si el email ya existe en
--      auth.users, sólo actualiza su profile a rol='operaciones'.
--
-- IMPORTANTE — contraseña '123456':
--   • Supabase Auth puede rechazar el login si el "Minimum password
--     length" del proyecto es >6. En ese caso, ir a Project Settings
--     → Authentication → Password requirements y bajar a 6, o usar
--     una contraseña con más caracteres (recomendado).
--   • Pedile al usuario que la CAMBIE en el primer login desde la
--     pantalla de perfil. '123456' es la contraseña más comprometida
--     del mundo y no debe quedarse permanente.
-- ============================================================
-- Requiere extensión pgcrypto (Supabase ya la tiene por defecto).
-- ============================================================

create extension if not exists pgcrypto;

do $$
declare
  -- ┌─────────────────────────────────────────────────┐
  -- │ EDITA ESTAS LÍNEAS SI QUIERES OTROS VALORES     │
  -- └─────────────────────────────────────────────────┘
  v_email constant text := 'operaciones@sumak.com.ec';
  v_nombre constant text := 'Operaciones Sumak';
  v_temp_password constant text := '123456';
  -- ──────────────────────────────────────────────────

  v_user_id uuid;
  v_existing_auth_id uuid;
  v_next_num integer;
  v_codigo text;
begin
  -- (la contraseña ahora es fija; antes era aleatoria)

  -- 2) ¿Ya existe el auth.users? Si sí, sólo asegurar profile.
  select id into v_existing_auth_id
    from auth.users where email = v_email
    limit 1;

  if v_existing_auth_id is not null then
    v_user_id := v_existing_auth_id;
    raise notice 'auth.users con email % ya existe (id=%). Sólo actualizo el profile.',
      v_email, v_user_id;
  else
    -- 3) Crear auth.users a mano. Esto es soportado por Supabase pero
    --    requiere llenar varios campos. La contraseña va con bcrypt.
    v_user_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', v_email,
      crypt(v_temp_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(),
      '', '', '', ''
    );

    -- Identidad necesaria para que Supabase Auth lo reconozca.
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at
    ) values (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email', v_user_id::text,
      now(), now(), now()
    );
  end if;

  -- 4) Calcular el próximo código SUMAK-XXXXX.
  select coalesce(max(
    nullif(regexp_replace(codigo_distribuidor, '\D', '', 'g'), '')::int
  ), 0) + 1
    into v_next_num
    from public.profiles
   where codigo_distribuidor like 'SUMAK-%';
  v_codigo := 'SUMAK-' || lpad(v_next_num::text, 5, '0');

  -- 5) Insertar o actualizar el profile con rol='operaciones'.
  --    Usamos un dummy cedula único porque cedula es NOT NULL UNIQUE
  --    en el schema actual; se puede actualizar luego desde el panel.
  insert into public.profiles (
    id, codigo_distribuidor, nombre_completo, cedula, email,
    rol, estado, fecha_aprobacion
  ) values (
    v_user_id, v_codigo, v_nombre,
    'OPS-' || substr(v_user_id::text, 1, 8),  -- placeholder único
    v_email,
    'operaciones', 'activo', now()
  )
  on conflict (id) do update
    set rol = 'operaciones',
        estado = 'activo',
        nombre_completo = excluded.nombre_completo,
        email = excluded.email;

  -- 6) Imprimir confirmación para el admin.
  raise notice ' ';
  raise notice '──────────────────────────────────────────────';
  raise notice 'USUARIO OPERACIONES CREADO ✔';
  raise notice '──────────────────────────────────────────────';
  raise notice 'Email     : %', v_email;
  raise notice 'Contraseña: %  (TEMPORAL — debe cambiarla)', v_temp_password;
  raise notice 'Código    : %', v_codigo;
  raise notice 'Rol       : operaciones';
  raise notice '──────────────────────────────────────────────';
  raise notice 'Si el login falla por "password too short", ajusta';
  raise notice 'el minimo en Supabase: Authentication → Password';
  raise notice 'requirements → Minimum length = 6.';
  raise notice '──────────────────────────────────────────────';
end $$;

-- ── Reset rápido si necesitas otra contraseña: ──
-- update auth.users
--   set encrypted_password = crypt('NUEVA_CONTRASEÑA', gen_salt('bf')),
--       updated_at = now()
--   where email = 'operaciones@sumak.com.ec';
