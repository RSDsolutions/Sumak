
-- ============================================================
-- SUMAK - Migration 20260905000002 - Academy Program Diploma Issuance
-- ============================================================
-- Issues diploma upon program completion if applicable.
-- ============================================================

create or replace function public.complete_academy_program_if_eligible(p_program_id uuid, p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_enrollment public.academy_program_enrollments;
  v_program public.academy_programs;
  v_required integer;
  v_completed integer;
  v_name text;
begin
  if p_user_id is null or p_user_id <> auth.uid() and not public.is_academy_staff() then
    raise exception 'No autorizado' using errcode = 'P0001';
  end if;
  select * into v_enrollment from public.academy_program_enrollments
  where program_id = p_program_id and user_id = p_user_id and status in ('active', 'completed') for update;
  if not found then return jsonb_build_object('completed', false, 'reason', 'not_enrolled'); end if;
  if v_enrollment.status = 'completed' then return jsonb_build_object('completed', true, 'already_completed', true); end if;
  
  select * into v_program from public.academy_programs where id = p_program_id;
  
  select count(*) into v_required from public.academy_program_courses where program_id = p_program_id and is_required;
  select count(*) into v_completed from public.academy_program_courses pc
  join public.academy_enrollments e on e.course_id = pc.course_id and e.user_id = p_user_id and e.status = 'completed'
  where pc.program_id = p_program_id and pc.is_required;
  
  -- Calculate percentage based on completed/required, fallback to 0
  if v_required > 0 and round((v_completed::numeric / v_required) * 100, 2) < coalesce(v_program.completion_percentage_required, 100) then
    return jsonb_build_object('completed', false, 'completed_courses', v_completed, 'required_courses', v_required);
  end if;
  
  -- Mark as completed
  update public.academy_program_enrollments set status = 'completed', completed_at = coalesce(completed_at, now()) where id = v_enrollment.id;
  insert into public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (p_user_id, 'program_completed', 'program_enrollment', v_enrollment.id, jsonb_build_object('program_id', p_program_id));
  
  -- Issue diploma if program has a diploma type
  if v_program.diploma_type_id is not null then
    select nombre_completo into v_name from public.profiles where id = p_user_id;
    insert into public.academy_diploma_issuances (
      diploma_type_id,
      user_id,
      participant_name,
      program_name,
      diploma_number,
      status
    ) values (
      v_program.diploma_type_id,
      p_user_id,
      coalesce(v_name, 'Participante'),
      v_program.title,
      public.academy_next_diploma_number(),
      'issued'
    ) on conflict (user_id, diploma_type_id) do nothing;
  end if;
  
  return jsonb_build_object('completed', true, 'already_completed', false);
end;
$$;

revoke all on function public.complete_academy_program_if_eligible(uuid, uuid) from public;
grant execute on function public.complete_academy_program_if_eligible(uuid, uuid) to authenticated;
