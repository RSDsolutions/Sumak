-- ============================================================
-- Migración: Sistema de notificaciones persistentes en Supabase
-- Reemplaza localStorage como fuente canónica de notificaciones.
-- Soporta todos los tipos existentes del sistema SUMAK.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabla user_notifications
-- ------------------------------------------------------------
create table if not exists public.user_notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  tipo          text not null,
  titulo        text not null,
  descripcion   text not null,
  leido         boolean not null default false,
  link          text,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

alter table public.user_notifications enable row level security;

-- Índice para cargas rápidas por usuario (más recientes primero)
create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

-- Índice parcial para no-leídas (badge de campana)
create index if not exists user_notifications_unread_idx
  on public.user_notifications (user_id) where leido = false;

-- Restricción de tipo válido (equivalente a TipoNotificacion del frontend)
alter table public.user_notifications
  drop constraint if exists user_notifications_tipo_check;
alter table public.user_notifications
  add constraint user_notifications_tipo_check check (
    tipo in ('pedido','comision','afiliacion','sistema','alerta','perfil','red','academy')
  );

-- ------------------------------------------------------------
-- 2. RLS: el usuario solo lee y escribe sus propias notificaciones
-- ------------------------------------------------------------
drop policy if exists "user_notifications_select_own" on public.user_notifications;
create policy "user_notifications_select_own"
  on public.user_notifications for select
  using (user_id = auth.uid());

-- markAsRead / clearNotification (solo las propias)
drop policy if exists "user_notifications_update_own" on public.user_notifications;
create policy "user_notifications_update_own"
  on public.user_notifications for update
  using (user_id = auth.uid());

drop policy if exists "user_notifications_delete_own" on public.user_notifications;
create policy "user_notifications_delete_own"
  on public.user_notifications for delete
  using (user_id = auth.uid());

-- INSERT: solo via security definer functions (usuarios no insertan directamente)
drop policy if exists "user_notifications_insert_deny" on public.user_notifications;
create policy "user_notifications_insert_deny"
  on public.user_notifications for insert
  with check (false);

-- ------------------------------------------------------------
-- 3. Función interna de inserción de notificaciones
-- ------------------------------------------------------------
create or replace function public.insert_user_notification(
  p_user_id    uuid,
  p_tipo       text,
  p_titulo     text,
  p_descripcion text,
  p_link       text    default null,
  p_metadata   jsonb   default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.user_notifications (user_id, tipo, titulo, descripcion, link, metadata)
  values (p_user_id, p_tipo, p_titulo, p_descripcion, p_link, coalesce(p_metadata, '{}'))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.insert_user_notification(uuid, text, text, text, text, jsonb) from public;

-- ------------------------------------------------------------
-- 4. Trigger: notificaciones de inscripción Academy
--    Se dispara cuando cambia el status de academy_enrollments
-- ------------------------------------------------------------
create or replace function public.notify_academy_enrollment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_title text;
  v_link         text;
begin
  -- Obtener título del curso (solo para el texto; no se expone en datos sensibles)
  select title into v_course_title
  from public.academy_courses
  where id = NEW.course_id;

  v_link := '/academia/dashboard/cursos';

  -- Solo notificar cuando cambia el status
  if TG_OP = 'INSERT' or (TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status) then
    case NEW.status
      when 'pending' then
        -- Al estudiante: confirmación de solicitud
        perform public.insert_user_notification(
          NEW.user_id, 'academy',
          'Solicitud recibida',
          'Tu solicitud para "' || coalesce(v_course_title, 'el curso') || '" fue enviada. Recibirás una respuesta pronto.',
          v_link,
          jsonb_build_object('enrollment_id', NEW.id, 'course_id', NEW.course_id, 'event', 'enrollment_requested')
        );

      when 'payment_pending' then
        perform public.insert_user_notification(
          NEW.user_id, 'academy',
          'Solicitud aprobada — Pago pendiente',
          'Tu solicitud para "' || coalesce(v_course_title, 'el curso') || '" fue aprobada. Completa el pago para activar tu acceso.',
          '/academia/cursos/' || (select slug from public.academy_courses where id = NEW.course_id),
          jsonb_build_object('enrollment_id', NEW.id, 'course_id', NEW.course_id, 'event', 'payment_pending')
        );

      when 'active' then
        perform public.insert_user_notification(
          NEW.user_id, 'academy',
          '¡Acceso activado!',
          'Tu acceso a "' || coalesce(v_course_title, 'el curso') || '" está activo. Tienes 3 meses para completarlo.',
          v_link,
          jsonb_build_object('enrollment_id', NEW.id, 'course_id', NEW.course_id, 'event', 'enrollment_activated', 'expires_at', NEW.expires_at)
        );

      when 'rejected' then
        perform public.insert_user_notification(
          NEW.user_id, 'academy',
          'Solicitud rechazada',
          'Tu solicitud para "' || coalesce(v_course_title, 'el curso') || '" fue rechazada' ||
            case when NEW.rejection_reason is not null then ': ' || NEW.rejection_reason else '.' end,
          v_link,
          jsonb_build_object('enrollment_id', NEW.id, 'course_id', NEW.course_id, 'event', 'enrollment_rejected')
        );

      when 'expired' then
        perform public.insert_user_notification(
          NEW.user_id, 'academy',
          'Acceso expirado',
          'Tu acceso a "' || coalesce(v_course_title, 'el curso') || '" ha expirado. Tu progreso y logros están guardados.',
          v_link,
          jsonb_build_object('enrollment_id', NEW.id, 'course_id', NEW.course_id, 'event', 'enrollment_expired')
        );

      when 'completed' then
        perform public.insert_user_notification(
          NEW.user_id, 'academy',
          '¡Curso completado!',
          '¡Felicidades! Completaste "' || coalesce(v_course_title, 'el curso') || '". Revisa tus certificados.',
          '/academia/dashboard/diplomas',
          jsonb_build_object('enrollment_id', NEW.id, 'course_id', NEW.course_id, 'event', 'course_completed')
        );

      else null; -- No notificar para otros estados (cancelled, dropped, suspended)
    end case;
  end if;

  return NEW;
end;
$$;

drop trigger if exists tg_notify_academy_enrollment on public.academy_enrollments;
create trigger tg_notify_academy_enrollment
  after insert or update of status
  on public.academy_enrollments
  for each row
  execute function public.notify_academy_enrollment_change();

-- ------------------------------------------------------------
-- 5. Trigger: notificación al emitir certificado
-- ------------------------------------------------------------
create or replace function public.notify_academy_certificate_issued()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_title text;
begin
  select title into v_course_title
  from public.academy_courses
  where id = NEW.course_id;

  perform public.insert_user_notification(
    NEW.user_id, 'academy',
    'Certificado emitido',
    'Tu certificado para "' || coalesce(v_course_title, 'el curso') || '" ya está disponible.',
    '/academia/dashboard/diplomas',
    jsonb_build_object('certificate_id', NEW.id, 'course_id', NEW.course_id, 'event', 'certificate_issued')
  );

  return NEW;
end;
$$;

drop trigger if exists tg_notify_academy_certificate on public.academy_certificates;
create trigger tg_notify_academy_certificate
  after insert
  on public.academy_certificates
  for each row
  execute function public.notify_academy_certificate_issued();

-- ------------------------------------------------------------
-- 6. Función para recordatorios de vencimiento
--    Llamada por pg_cron. Idempotente: usa clave única en metadata.
-- ------------------------------------------------------------
create or replace function public.send_academy_expiry_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec   record;
  v_key   text;
  v_dias  int;
  v_count int := 0;
begin
  -- Revisar ventanas de recordatorio: 30, 15, 7, 3, 1 días
  for v_rec in
    select
      e.id          as enrollment_id,
      e.user_id,
      e.course_id,
      e.expires_at,
      c.title       as course_title,
      extract(day from (e.expires_at - now()))::int as days_left
    from public.academy_enrollments e
    join public.academy_courses c on c.id = e.course_id
    where e.status = 'active'
      and e.expires_at is not null
      and extract(day from (e.expires_at - now()))::int in (30, 15, 7, 3, 1)
  loop
    v_dias := v_rec.days_left;
    -- Clave única por (usuario, inscripción, tipo, intervalo) — evita duplicados
    v_key := 'expiry_reminder_' || v_rec.enrollment_id::text || '_d' || v_dias::text;

    -- Solo insertar si no existe ya una notificación con esa clave hoy
    if not exists (
      select 1 from public.user_notifications
      where user_id = v_rec.user_id
        and metadata->>'reminder_key' = v_key
        and created_at >= date_trunc('day', now())
    ) then
      perform public.insert_user_notification(
        v_rec.user_id,
        'academy',
        'Tu acceso vence en ' || v_dias || case when v_dias = 1 then ' día' else ' días' end,
        'Tu acceso a "' || v_rec.course_title || '" vence el ' ||
          to_char(v_rec.expires_at at time zone 'America/Guayaquil', 'DD/MM/YYYY') || '. ¡Sigue avanzando!',
        '/academia/dashboard/cursos',
        jsonb_build_object(
          'enrollment_id', v_rec.enrollment_id,
          'course_id',     v_rec.course_id,
          'days_left',     v_dias,
          'event',         'expiry_reminder',
          'reminder_key',  v_key
        )
      );
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;
revoke all on function public.send_academy_expiry_reminders() from public;

-- ------------------------------------------------------------
-- 7. Programar recordatorios diarios con pg_cron (03:20 UTC)
--    Un minuto después del job de expiración (03:15 UTC)
-- ------------------------------------------------------------
select cron.schedule(
  'academy-expiry-reminders',
  '20 3 * * *',
  $$select public.send_academy_expiry_reminders();$$
);

-- ------------------------------------------------------------
-- 8. Función RPC para que el frontend marque como leídas en lote
-- ------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_notifications
  set leido = true
  where id = any(p_ids)
    and user_id = auth.uid();
end;
$$;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
