
create or replace function public.academy_next_credential_number(p_type text)
returns text
language plpgsql
as $$
declare
  v_seq bigint;
  v_prefix text;
begin
  if p_type = 'certificate' then
    v_seq := nextval('public.academy_certificate_seq');
    v_prefix := 'SUMAK-CERT-' || to_char(now(), 'YYYY') || '-';
  else
    v_seq := nextval('public.academy_diploma_seq');
    v_prefix := 'SUMAK-DIP-' || to_char(now(), 'YYYY') || '-';
  end if;
  return v_prefix || lpad(v_seq::text, 6, '0');
end;
$$;

create or replace function public.issue_academy_course_certificate(p_course_id uuid)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_course public.academy_courses;
  v_issuance public.academy_diploma_issuances;
  v_name text;
  v_enrollment public.academy_enrollments;
begin
  if v_user_id is null then raise exception 'No autenticado' using errcode = 'P0001'; end if;
  select * into v_course from public.academy_courses where id = p_course_id and status = 'published' and generates_certificate;
  if not found then raise exception 'Curso no elegible para certificado' using errcode = 'P0002'; end if;
  
  perform public.complete_academy_course_if_eligible(p_course_id, v_user_id);
  select * into v_enrollment from public.academy_enrollments where user_id = v_user_id and course_id = p_course_id;
  if not found or v_enrollment.status <> 'completed' then raise exception 'El curso aAn no estA completado' using errcode = 'P0003'; end if;
  
  select nombre_completo into v_name from public.profiles where id = v_user_id;
  
  insert into public.academy_diploma_issuances (
    credential_type,
    user_id, 
    course_id, 
    diploma_number, 
    verification_code,
    verification_token,
    participant_name, 
    course_name,
    status
  )
  values (
    'certificate',
    v_user_id, 
    p_course_id, 
    public.academy_next_credential_number('certificate'),
    upper(substr(encode(gen_random_bytes(16), 'hex'), 1, 16)),
    encode(gen_random_bytes(32), 'hex'),
    coalesce(v_name, 'Participante'), 
    v_course.title,
    'pending_pdf'
  )
  on conflict (user_id, diploma_type_id, coalesce(course_id, '00000000-0000-0000-0000-000000000000')) where status not in ('revoked', 'superseded', 'invalidated')
  do update set course_name = excluded.course_name -- if somehow conflict hits, update name
  returning * into v_issuance;

  -- Because diploma_type_id is null for certificate (unless we set a default type), the conflict clause for no duplicates might fail if we don't handle it carefully. Wait, the conflict index includes diploma_type_id. If it's NULL, Postgres unique index doesn't consider NULLs as equal, so duplicates could be inserted!
  -- Let's fix the unique index for certificates!
  
  insert into public.academy_audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (v_user_id, 'credential_issued', 'certificate', v_issuance.id, jsonb_build_object('course_id', p_course_id, 'credential_number', v_issuance.diploma_number));
  
  return to_jsonb(v_issuance);
end;
$$;

drop index if exists public.academy_diploma_no_duplicate;

create unique index if not exists academy_credential_no_duplicate
  on public.academy_diploma_issuances (
    user_id, 
    coalesce(diploma_type_id, '00000000-0000-0000-0000-000000000000'), 
    coalesce(course_id, '00000000-0000-0000-0000-000000000000'),
    coalesce(program_id, '00000000-0000-0000-0000-000000000000')
  )
  where status not in ('revoked', 'superseded', 'invalidated');


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
      credential_type,
      diploma_type_id,
      user_id,
      program_id,
      participant_name,
      program_name,
      diploma_number,
      verification_code,
      verification_token,
      status
    ) values (
      'diploma',
      v_program.diploma_type_id,
      p_user_id,
      p_program_id,
      coalesce(v_name, 'Participante'),
      v_program.title,
      public.academy_next_credential_number('diploma'),
      upper(substr(encode(gen_random_bytes(16), 'hex'), 1, 16)),
      encode(gen_random_bytes(32), 'hex'),
      'pending_pdf'
    ) on conflict (user_id, coalesce(diploma_type_id, '00000000-0000-0000-0000-000000000000'), coalesce(course_id, '00000000-0000-0000-0000-000000000000'), coalesce(program_id, '00000000-0000-0000-0000-000000000000')) where status not in ('revoked', 'superseded', 'invalidated') do nothing;
  end if;
  
  return jsonb_build_object('completed', true, 'already_completed', false);
end;
$$;

