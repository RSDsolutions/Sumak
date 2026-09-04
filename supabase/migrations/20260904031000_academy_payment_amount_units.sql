create or replace function public.activate_academy_enrollment_after_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_payment public.pagos;
  v_enrollment public.academy_enrollments;
  v_course public.academy_courses;
  v_expected_amount numeric;
  v_now timestamptz := now();
begin
  select * into v_payment from public.pagos where id = p_payment_id and status = 'approved' for update;
  if not found then raise exception 'Pago aprobado no encontrado' using errcode = 'P0002'; end if;
  select * into v_enrollment from public.academy_enrollments where payment_id = p_payment_id for update;
  if not found then raise exception 'Inscripción vinculada al pago no encontrada' using errcode = 'P0003'; end if;
  if v_enrollment.status = 'active' then return jsonb_build_object('ok', true, 'already_active', true, 'enrollment', to_jsonb(v_enrollment)); end if;
  if v_enrollment.status <> 'payment_pending' then raise exception 'La inscripción no espera confirmación de pago' using errcode = 'P0004'; end if;
  if v_payment.user_id <> v_enrollment.user_id then raise exception 'El pago no pertenece al estudiante' using errcode = 'P0005'; end if;
  select * into v_course from public.academy_courses where id = v_enrollment.course_id;
  if not found then raise exception 'Curso vinculado a la inscripción no encontrado' using errcode = 'P0006'; end if;
  v_expected_amount := case when v_payment.provider = 'payphone' then v_payment.amount / 100 else v_payment.amount end;
  if v_course.price is null or round(v_expected_amount, 2) <> round(v_course.price, 2) then raise exception 'El monto del pago no coincide con el precio del curso' using errcode = 'P0007'; end if;
  update public.academy_enrollments set status = 'active', payment_status = 'paid', activated_at = v_now, expires_at = v_now + interval '3 months' where id = v_enrollment.id returning * into v_enrollment;
  insert into public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata) values
    (v_enrollment.user_id, 'payment_confirmed', 'enrollment', v_enrollment.id, jsonb_build_object('payment_id', p_payment_id, 'provider', v_payment.provider)),
    (v_enrollment.user_id, 'enrollment_activated', 'enrollment', v_enrollment.id, jsonb_build_object('activated_at', v_enrollment.activated_at, 'expires_at', v_enrollment.expires_at));
  return jsonb_build_object('ok', true, 'enrollment', to_jsonb(v_enrollment));
end;
$$;

revoke all on function public.activate_academy_enrollment_after_payment(uuid) from public;
grant execute on function public.activate_academy_enrollment_after_payment(uuid) to service_role;