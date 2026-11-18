-- =============================================================================
-- MIGRATION: 20261118000001_academy_unified_payments_and_approvals.sql
-- DESCRIPCIÓN:
--   Unificación completa del motor de pagos de SUMAK Academy (Cursos, Programas y Recetas)
--   integrando:
--   1. Metodología activa: Transferencia Bancaria bajo confirmación con voucher.
--   2. Metodología pre-integrada (lista para encender): Pasarelas Digitales (PayPhone y PayPal).
--   3. Trazabilidad centralizada en public.pagos y public.academy_audit_logs.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EVOLUCIÓN DE ESQUEMA: academy_enrollments, academy_recipe_purchases y pagos
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.academy_enrollments
  add column if not exists payment_method text,
  add column if not exists banco_destino text,
  add column if not exists voucher_numero text,
  add column if not exists payment_receipt_url text,
  add column if not exists payment_submitted_at timestamptz,
  add column if not exists payment_reviewed_at timestamptz,
  add column if not exists payment_reviewed_by uuid references auth.users(id) on delete set null;

alter table public.academy_recipe_purchases
  add column if not exists payment_id uuid references public.pagos(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.pagos
  add column if not exists academy_enrollment_id uuid references public.academy_enrollments(id) on delete set null,
  add column if not exists academy_recipe_purchase_id uuid references public.academy_recipe_purchases(id) on delete set null;

create index if not exists pagos_academy_enrollment_id_idx
  on public.pagos (academy_enrollment_id)
  where academy_enrollment_id is not null;

create index if not exists pagos_academy_recipe_purchase_id_idx
  on public.pagos (academy_recipe_purchase_id)
  where academy_recipe_purchase_id is not null;

-- Actualizar política de Storage en academy-receipts para cubrir tanto Recetas como Cursos
drop policy if exists "receipts usuario propio" on storage.objects;
create policy "receipts usuario propio" on storage.objects
  for select using (
    bucket_id = 'academy-receipts' and (
      public.is_academy_staff()
      or exists (
        select 1 from public.academy_recipe_purchases p
        where p.user_id = auth.uid() and p.payment_receipt_url = name
      )
      or exists (
        select 1 from public.academy_enrollments e
        where e.user_id = auth.uid() and e.payment_receipt_url = name
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FLUJO INTELIGENTE DE SOLICITUD E INSCRIPCIÓN A CURSOS
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.request_academy_enrollment(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_course public.academy_courses;
  v_enrollment public.academy_enrollments;
  v_is_paid boolean;
  v_initial_status text;
  v_initial_payment_status text;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = 'P0001';
  end if;

  select * into v_course
  from public.academy_courses
  where id = p_course_id and status = 'published';

  if not found then
    raise exception 'Curso no disponible' using errcode = 'P0002';
  end if;

  select * into v_enrollment
  from public.academy_enrollments
  where user_id = v_user_id and course_id = p_course_id;

  if found then
    -- Si la inscripción estaba rechazada o expirada y el curso es pagado, permitir reabrir para pago
    if v_enrollment.status in ('rejected', 'expired', 'cancelled') then
      v_is_paid := coalesce(v_course.price, 0) > 0;
      update public.academy_enrollments
      set
        status = case when v_is_paid then 'payment_pending' else 'active' end,
        payment_status = case when v_is_paid then 'unpaid' else 'not_required' end,
        requested_at = v_now,
        activated_at = case when not v_is_paid then v_now else activated_at end,
        expires_at = case when not v_is_paid then v_now + interval '6 months' else expires_at end,
        rejection_reason = null
      where id = v_enrollment.id
      returning * into v_enrollment;
    end if;

    return jsonb_build_object('ok', true, 'already_exists', true, 'enrollment', to_jsonb(v_enrollment));
  end if;

  v_is_paid := coalesce(v_course.price, 0) > 0;

  if v_is_paid then
    -- Cursos con precio > 0 pasan directo a payment_pending para que el alumno pueda pagar de inmediato
    v_initial_status := 'payment_pending';
    v_initial_payment_status := 'unpaid';
  elsif v_course.access_mode in ('public', 'free_registered') then
    -- Cursos gratuitos públicos/registrados se activan de inmediato
    v_initial_status := 'active';
    v_initial_payment_status := 'not_required';
  else
    -- Cursos exclusivos o asignados pasan por revisión previa
    v_initial_status := 'pending';
    v_initial_payment_status := 'not_required';
  end if;

  insert into public.academy_enrollments (
    user_id, course_id, status, payment_status,
    requested_at, activated_at, expires_at
  ) values (
    v_user_id,
    p_course_id,
    v_initial_status,
    v_initial_payment_status,
    v_now,
    case when v_initial_status = 'active' then v_now else null end,
    case when v_initial_status = 'active' then v_now + interval '6 months' else null end
  )
  returning * into v_enrollment;

  insert into public.academy_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    case when v_initial_status = 'active' then 'enrollment_auto_activated' else 'enrollment_requested' end,
    'enrollment',
    v_enrollment.id,
    jsonb_build_object('course_id', p_course_id, 'price', coalesce(v_course.price, 0), 'status', v_initial_status)
  );

  return jsonb_build_object('ok', true, 'enrollment', to_jsonb(v_enrollment));
end;
$$;

grant execute on function public.request_academy_enrollment(uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC PARA REGISTRO DE PAGO POR TRANSFERENCIA BANCARIA EN CURSOS
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.submit_academy_enrollment_transfer(
  p_course_id uuid,
  p_receipt_url text,
  p_banco_destino text,
  p_voucher_numero text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_course public.academy_courses;
  v_enrollment public.academy_enrollments;
  v_payment public.pagos;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = 'P0001';
  end if;

  if p_receipt_url is null or length(trim(p_receipt_url)) = 0 then
    raise exception 'El comprobante de pago es obligatorio' using errcode = 'P0002';
  end if;

  if p_banco_destino is null or length(trim(p_banco_destino)) = 0 then
    raise exception 'Debe indicar el banco de destino' using errcode = 'P0003';
  end if;

  if p_voucher_numero is null or length(trim(p_voucher_numero)) < 4 then
    raise exception 'Ingrese un número de comprobante válido (mínimo 4 caracteres)' using errcode = 'P0004';
  end if;

  select * into v_course
  from public.academy_courses
  where id = p_course_id and status = 'published';

  if not found then
    raise exception 'Curso no encontrado' using errcode = 'P0005';
  end if;

  -- Buscar o crear la inscripción del estudiante
  select * into v_enrollment
  from public.academy_enrollments
  where user_id = v_user_id and course_id = p_course_id
  for update;

  if not found then
    insert into public.academy_enrollments (
      user_id, course_id, status, payment_status, requested_at
    ) values (
      v_user_id, p_course_id, 'payment_pending', 'pending_verification', v_now
    )
    returning * into v_enrollment;
  end if;

  if v_enrollment.status in ('active', 'completed') and v_enrollment.payment_status = 'paid' then
    return jsonb_build_object('ok', true, 'already_paid', true, 'enrollment', to_jsonb(v_enrollment));
  end if;

  -- Crear registro contable en public.pagos
  insert into public.pagos (
    user_id,
    academy_enrollment_id,
    provider,
    payment_method,
    transaction_id,
    amount,
    currency,
    status,
    metadata
  ) values (
    v_user_id,
    v_enrollment.id,
    'bank_transfer',
    'bank_transfer',
    'ACAD-ENR-' || v_enrollment.id::text || '-' || extract(epoch from v_now)::bigint::text,
    coalesce(v_course.price, 0),
    'USD',
    'pending_verification',
    jsonb_build_object(
      'context', 'academy_course',
      'course_id', v_course.id,
      'course_title', v_course.title,
      'banco_destino', trim(p_banco_destino),
      'voucher_numero', trim(p_voucher_numero),
      'payment_receipt_url', trim(p_receipt_url)
    )
  )
  returning * into v_payment;

  -- Actualizar la inscripción con los datos del comprobante
  update public.academy_enrollments
  set
    status = 'payment_pending',
    payment_status = 'pending_verification',
    payment_method = 'transferencia',
    banco_destino = trim(p_banco_destino),
    voucher_numero = trim(p_voucher_numero),
    payment_receipt_url = trim(p_receipt_url),
    payment_submitted_at = v_now,
    payment_id = v_payment.id,
    rejection_reason = null
  where id = v_enrollment.id
  returning * into v_enrollment;

  insert into public.academy_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'enrollment_transfer_submitted',
    'enrollment',
    v_enrollment.id,
    jsonb_build_object(
      'payment_id', v_payment.id,
      'banco_destino', trim(p_banco_destino),
      'voucher_numero', trim(p_voucher_numero),
      'amount', coalesce(v_course.price, 0)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'payment_id', v_payment.id,
    'enrollment', to_jsonb(v_enrollment)
  );
end;
$$;

grant execute on function public.submit_academy_enrollment_transfer(uuid, text, text, text) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC DE REVISIÓN Y APROBACIÓN ADMINISTRATIVA (INSCRIPCIÓN Y PAGO DE CURSO)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.review_academy_enrollment(
  p_enrollment_id uuid,
  p_decision text,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_enrollment public.academy_enrollments;
  v_course public.academy_courses;
  v_status text;
  v_payment_status text;
  v_now timestamptz := now();
begin
  if v_actor is null or not public.is_academy_staff() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;

  if p_decision not in ('approve', 'reject') then
    raise exception 'Decisión inválida' using errcode = 'P0002';
  end if;

  if p_decision = 'reject' and length(trim(coalesce(p_rejection_reason, ''))) < 5 then
    raise exception 'El rechazo requiere un motivo de al menos 5 caracteres' using errcode = 'P0003';
  end if;

  select * into v_enrollment
  from public.academy_enrollments
  where id = p_enrollment_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada' using errcode = 'P0004';
  end if;

  select * into v_course
  from public.academy_courses
  where id = v_enrollment.course_id;

  if p_decision = 'reject' then
    -- Si tenía un comprobante en verificación, permite reenviar; si era solicitud general, marca rechazado
    if v_enrollment.payment_status = 'pending_verification' then
      v_status := 'payment_pending';
      v_payment_status := 'rejected';
    else
      v_status := 'rejected';
      v_payment_status := v_enrollment.payment_status;
    end if;

    if v_enrollment.payment_id is not null then
      update public.pagos
      set status = 'rejected',
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('rejection_reason', trim(p_rejection_reason), 'reviewed_by', v_actor)
      where id = v_enrollment.payment_id;
    end if;
  else
    -- Decisión: approve
    -- Si ya subió comprobante (pending_verification) o el curso es gratuito o el admin aprueba directamente el pago:
    if v_enrollment.payment_status = 'pending_verification' or coalesce(v_course.price, 0) = 0 or v_enrollment.status = 'payment_pending' then
      v_status := 'active';
      v_payment_status := case when coalesce(v_course.price, 0) > 0 then 'paid' else 'not_required' end;

      if v_enrollment.payment_id is not null then
        update public.pagos
        set status = 'approved',
            paid_at = v_now,
            metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('approved_by', v_actor, 'approved_at', v_now)
        where id = v_enrollment.payment_id;
      end if;
    else
      v_status := 'payment_pending';
      v_payment_status := 'unpaid';
    end if;
  end if;

  update public.academy_enrollments
  set
    status = v_status,
    payment_status = v_payment_status,
    approved_at = case when p_decision = 'approve' then coalesce(approved_at, v_now) else approved_at end,
    approved_by = case when p_decision = 'approve' then coalesce(approved_by, v_actor) else approved_by end,
    payment_reviewed_at = case when v_enrollment.payment_status = 'pending_verification' or v_enrollment.status = 'payment_pending' then v_now else payment_reviewed_at end,
    payment_reviewed_by = case when v_enrollment.payment_status = 'pending_verification' or v_enrollment.status = 'payment_pending' then v_actor else payment_reviewed_by end,
    rejected_at = case when p_decision = 'reject' then v_now else null end,
    rejection_reason = case when p_decision = 'reject' then trim(p_rejection_reason) else null end,
    activated_at = case when v_status = 'active' then coalesce(activated_at, v_now) else activated_at end,
    expires_at = case when v_status = 'active' then v_now + interval '3 months' else expires_at end
  where id = p_enrollment_id
  returning * into v_enrollment;

  insert into public.academy_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    case when p_decision = 'approve' then 'enrollment_approved' else 'enrollment_rejected' end,
    'enrollment',
    p_enrollment_id,
    jsonb_build_object('status', v_status, 'payment_status', v_payment_status, 'reason', p_rejection_reason)
  );

  return to_jsonb(v_enrollment);
end;
$$;

grant execute on function public.review_academy_enrollment(uuid, text, text) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC DE RECETAS UNIFICADA CON public.pagos Y PASARELAS DIGITALES
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.create_academy_recipe_purchase(
  p_recipe_ids uuid[],
  p_payment_method text,
  p_payment_receipt_url text default null,
  p_banco_destino text default null,
  p_voucher_numero text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_purchase public.academy_recipe_purchases;
  v_payment public.pagos;
  v_total numeric(10,2);
  v_method text := lower(trim(coalesce(p_payment_method, 'transferencia')));
  v_provider text;
  v_initial_status text;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = 'P0001';
  end if;

  if p_recipe_ids is null or cardinality(p_recipe_ids) = 0 then
    raise exception 'Debe seleccionar al menos una receta' using errcode = 'P0002';
  end if;

  if exists (select 1 from unnest(p_recipe_ids) ids group by ids having count(*) > 1) then
    raise exception 'Recetas duplicadas' using errcode = 'P0004';
  end if;

  select coalesce(sum(price), 0)::numeric(10,2) into v_total
  from public.academy_recipes
  where id = any(p_recipe_ids) and is_active;

  if (select count(*) from public.academy_recipes where id = any(p_recipe_ids) and is_active) <> cardinality(p_recipe_ids) then
    raise exception 'Una o más recetas no están disponibles' using errcode = 'P0005';
  end if;

  v_provider := case
    when v_method in ('payphone', 'paypal') then v_method
    else 'bank_transfer'
  end;

  v_initial_status := case
    when v_method in ('payphone', 'paypal') then 'processing'
    else 'pending'
  end;

  insert into public.academy_recipe_purchases (
    user_id, total_amount, payment_method, payment_receipt_url, banco_destino, voucher_numero, status
  ) values (
    v_user_id,
    v_total,
    v_method,
    nullif(trim(coalesce(p_payment_receipt_url, '')), ''),
    nullif(trim(coalesce(p_banco_destino, '')), ''),
    nullif(trim(coalesce(p_voucher_numero, '')), ''),
    v_initial_status
  )
  returning * into v_purchase;

  insert into public.academy_recipe_purchase_items (purchase_id, recipe_id, price_at_purchase)
  select v_purchase.id, r.id, r.price
  from public.academy_recipes r
  where r.id = any(p_recipe_ids) and r.is_active;

  -- Si es transferencia bancaria, asentar en public.pagos inmediatamente
  if v_provider = 'bank_transfer' then
    insert into public.pagos (
      user_id,
      academy_recipe_purchase_id,
      provider,
      payment_method,
      transaction_id,
      amount,
      currency,
      status,
      metadata
    ) values (
      v_user_id,
      v_purchase.id,
      'bank_transfer',
      'bank_transfer',
      'ACAD-REC-' || v_purchase.id::text,
      v_total,
      'USD',
      'pending_verification',
      jsonb_build_object(
        'context', 'academy_recipes',
        'purchase_id', v_purchase.id,
        'recipe_ids', to_jsonb(p_recipe_ids),
        'banco_destino', nullif(trim(coalesce(p_banco_destino, '')), ''),
        'voucher_numero', nullif(trim(coalesce(p_voucher_numero, '')), ''),
        'payment_receipt_url', nullif(trim(coalesce(p_payment_receipt_url, '')), '')
      )
    )
    returning * into v_payment;

    update public.academy_recipe_purchases
    set payment_id = v_payment.id
    where id = v_purchase.id;
  end if;

  return jsonb_build_object(
    'purchase_id', v_purchase.id,
    'payment_id', v_payment.id,
    'total_amount', v_total,
    'status', v_purchase.status
  );
end;
$$;

grant execute on function public.create_academy_recipe_purchase(uuid[], text, text, text, text) to authenticated;


-- Actualizar review_academy_recipe_purchase para sincronizar con public.pagos
create or replace function public.review_academy_recipe_purchase(
  p_purchase_id uuid,
  p_status text,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_purchase public.academy_recipe_purchases;
  v_now timestamptz := now();
begin
  if v_actor is null or not public.is_academy_staff() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Estado de revisión inválido' using errcode = 'P0002';
  end if;

  if p_status = 'rejected' and length(trim(coalesce(p_rejection_reason, ''))) < 5 then
    raise exception 'El rechazo requiere un motivo' using errcode = 'P0003';
  end if;

  update public.academy_recipe_purchases
  set
    status = p_status,
    approved_by = v_actor,
    approved_at = v_now,
    rejection_reason = case when p_status = 'rejected' then trim(p_rejection_reason) else null end
  where id = p_purchase_id and status in ('pending', 'processing')
  returning * into v_purchase;

  if not found then
    raise exception 'Compra de recetas no disponible para revisión' using errcode = 'P0004';
  end if;

  if v_purchase.payment_id is not null then
    update public.pagos
    set
      status = p_status,
      paid_at = case when p_status = 'approved' then v_now else null end,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('reviewed_by', v_actor, 'reviewed_at', v_now, 'rejection_reason', p_rejection_reason)
    where id = v_purchase.payment_id;
  end if;

  insert into public.academy_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    case when p_status = 'approved' then 'recipe_purchase_approved' else 'recipe_purchase_rejected' end,
    'recipe_purchase',
    v_purchase.id,
    jsonb_build_object('status', p_status, 'total_amount', v_purchase.total_amount, 'reason', p_rejection_reason)
  );

  return to_jsonb(v_purchase);
end;
$$;

grant execute on function public.review_academy_recipe_purchase(uuid, text, text) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ACTIVACIÓN AUTOMÁTICA DE RECETAS TRAS PAGO DIGITAL (PAYPHONE / PAYPAL)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.activate_academy_recipes_after_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_payment public.pagos;
  v_purchase public.academy_recipe_purchases;
  v_expected_amount numeric;
  v_now timestamptz := now();
begin
  select * into v_payment
  from public.pagos
  where id = p_payment_id and status = 'approved'
  for update;

  if not found then
    raise exception 'Pago aprobado no encontrado' using errcode = 'P0002';
  end if;

  select * into v_purchase
  from public.academy_recipe_purchases
  where payment_id = p_payment_id or id = v_payment.academy_recipe_purchase_id
  for update;

  if not found then
    raise exception 'Compra de recetas vinculada al pago no encontrada' using errcode = 'P0003';
  end if;

  if v_purchase.status = 'approved' then
    return jsonb_build_object('ok', true, 'already_approved', true, 'purchase', to_jsonb(v_purchase));
  end if;

  v_expected_amount := case when v_payment.provider = 'payphone' then v_payment.amount / 100 else v_payment.amount end;

  if round(v_expected_amount, 2) <> round(v_purchase.total_amount, 2) then
    raise exception 'El monto del pago no coincide con el total de las recetas' using errcode = 'P0007';
  end if;

  update public.academy_recipe_purchases
  set
    status = 'approved',
    approved_at = v_now,
    payment_id = p_payment_id
  where id = v_purchase.id
  returning * into v_purchase;

  insert into public.academy_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_purchase.user_id,
    'recipe_purchase_auto_approved',
    'recipe_purchase',
    v_purchase.id,
    jsonb_build_object('payment_id', p_payment_id, 'provider', v_payment.provider, 'amount', v_purchase.total_amount)
  );

  return jsonb_build_object('ok', true, 'purchase', to_jsonb(v_purchase));
end;
$$;

revoke all on function public.activate_academy_recipes_after_payment(uuid) from public;
grant execute on function public.activate_academy_recipes_after_payment(uuid) to authenticated, service_role;
grant execute on function public.activate_academy_enrollment_after_payment(uuid) to authenticated, service_role;
