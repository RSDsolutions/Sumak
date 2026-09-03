create or replace function public.get_my_program_progress(p_program_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_required integer;
	v_completed integer;
	v_percentage numeric(5,2);
begin
	if v_user_id is null then raise exception 'No autenticado' using errcode = 'P0001'; end if;
	if not exists (select 1 from public.academy_programs where id = p_program_id and status = 'published') then
		raise exception 'Programa no disponible' using errcode = 'P0002';
	end if;
	select count(*) into v_required from public.academy_program_courses where program_id = p_program_id and is_required;
	select count(*) into v_completed
	from public.academy_program_courses pc
	join public.academy_enrollments e on e.course_id = pc.course_id and e.user_id = v_user_id and e.status = 'completed'
	where pc.program_id = p_program_id and pc.is_required;
	v_percentage := case when v_required = 0 then 0 else round((v_completed::numeric / v_required) * 100, 2) end;
	return jsonb_build_object('program_id', p_program_id, 'required_courses', v_required, 'completed_courses', v_completed, 'percentage', v_percentage, 'eligible', v_required > 0 and v_percentage >= (select completion_percentage_required from public.academy_programs where id = p_program_id));
end;
$$;

grant execute on function public.get_my_program_progress(uuid) to authenticated;

create or replace function public.check_my_program_diploma_eligibility(p_program_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_progress jsonb;
	v_diploma_type_id uuid;
begin
	v_progress := public.get_my_program_progress(p_program_id);
	select diploma_type_id into v_diploma_type_id from public.academy_programs where id = p_program_id;
	return v_progress || jsonb_build_object('has_diploma_type', v_diploma_type_id is not null, 'eligible_for_diploma', (v_progress ->> 'eligible')::boolean and v_diploma_type_id is not null);
end;
$$;

grant execute on function public.check_my_program_diploma_eligibility(uuid) to authenticated;
