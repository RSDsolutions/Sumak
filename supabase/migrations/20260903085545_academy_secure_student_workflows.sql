create or replace view public.academy_question_options_public as
select
	id,
	question_id,
	option_text,
	sort_order,
	created_at
from public.academy_question_options o
where exists (
	select 1
	from public.academy_questions q
	join public.academy_assessments a on a.id = q.assessment_id
	where q.id = o.question_id
		and a.is_published
		and public.has_course_access(a.course_id)
);

grant select on public.academy_question_options_public to authenticated;
revoke select on public.academy_question_options from authenticated;

create or replace function public.enroll_academy_course(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_course public.academy_courses;
	v_enrollment public.academy_enrollments;
begin
	if v_user_id is null then
		raise exception 'No autenticado' using errcode = 'P0001';
	end if;

	select * into v_course
	from public.academy_courses
	where id = p_course_id
		and status = 'published';

	if not found then
		raise exception 'Curso no disponible' using errcode = 'P0002';
	end if;

	if v_course.access_mode not in ('public', 'free_registered', 'sumak_exclusive') then
		raise exception 'El curso requiere una asignación o compra' using errcode = 'P0003';
	end if;

	if v_course.access_mode = 'sumak_exclusive' and not exists (
		select 1 from public.profiles where id = v_user_id and estado = 'activo'
	) then
		raise exception 'Usuario no elegible para este curso' using errcode = 'P0004';
	end if;

	insert into public.academy_enrollments (user_id, course_id, status)
	values (v_user_id, p_course_id, 'active')
	on conflict (user_id, course_id) do update
		set status = case
			when public.academy_enrollments.status in ('dropped', 'suspended') then 'active'
			else public.academy_enrollments.status
		end
	returning * into v_enrollment;

	return to_jsonb(v_enrollment);
end;
$$;

grant execute on function public.enroll_academy_course(uuid) to authenticated;
revoke insert, update, delete on public.academy_enrollments from authenticated;

create or replace function public.update_academy_progress(
	p_lesson_id uuid,
	p_course_id uuid,
	p_status text,
	p_percentage numeric,
	p_playback_seconds integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_progress public.academy_progress;
	v_now timestamptz := now();
begin
	if v_user_id is null then
		raise exception 'No autenticado' using errcode = 'P0001';
	end if;
	if p_status not in ('in_progress', 'completed') or p_percentage < 0 or p_percentage > 100 then
		raise exception 'Progreso inválido' using errcode = 'P0002';
	end if;
	if p_playback_seconds < 0 then
		raise exception 'Tiempo de reproducción inválido' using errcode = 'P0003';
	end if;
	if not exists (
		select 1
		from public.academy_lessons l
		join public.academy_modules m on m.id = l.module_id
		where l.id = p_lesson_id
			and m.course_id = p_course_id
			and l.is_published
			and m.is_published
			and public.has_course_access(p_course_id)
	) then
		raise exception 'Lección no disponible' using errcode = 'P0004';
	end if;

	insert into public.academy_progress (
		user_id, lesson_id, course_id, status, progress_percentage,
		started_at, completed_at, last_accessed_at, playback_seconds
	) values (
		v_user_id, p_lesson_id, p_course_id, p_status, p_percentage,
		v_now, case when p_status = 'completed' then v_now end, v_now, p_playback_seconds
	)
	on conflict (user_id, lesson_id) do update set
		course_id = excluded.course_id,
		status = case when public.academy_progress.status = 'completed' then 'completed' else excluded.status end,
		progress_percentage = greatest(public.academy_progress.progress_percentage, excluded.progress_percentage),
		completed_at = case
			when public.academy_progress.completed_at is not null then public.academy_progress.completed_at
			when excluded.status = 'completed' then excluded.completed_at
			else null
		end,
		last_accessed_at = excluded.last_accessed_at,
		playback_seconds = greatest(public.academy_progress.playback_seconds, excluded.playback_seconds)
	returning * into v_progress;

	update public.academy_enrollments
	set last_accessed_at = v_now,
			started_at = coalesce(started_at, v_now)
	where user_id = v_user_id and course_id = p_course_id;

	return to_jsonb(v_progress);
end;
$$;

grant execute on function public.update_academy_progress(uuid, uuid, text, numeric, integer) to authenticated;
revoke insert, update, delete on public.academy_progress from authenticated;

create or replace function public.start_academy_attempt(p_assessment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_assessment public.academy_assessments;
	v_attempt_id uuid;
	v_attempt_count integer;
begin
	if v_user_id is null then
		raise exception 'No autenticado' using errcode = 'P0001';
	end if;

	select * into v_assessment
	from public.academy_assessments
	where id = p_assessment_id
		and is_published
		and public.has_course_access(course_id)
		and (available_from is null or available_from <= now())
		and (available_until is null or available_until >= now());

	if not found then
		raise exception 'Evaluación no disponible' using errcode = 'P0002';
	end if;

	select count(*) into v_attempt_count
	from public.academy_attempts
	where user_id = v_user_id and assessment_id = p_assessment_id;

	if v_assessment.max_attempts is not null and v_attempt_count >= v_assessment.max_attempts then
		raise exception 'Límite de intentos alcanzado' using errcode = 'P0003';
	end if;

	insert into public.academy_attempts (user_id, assessment_id, status)
	values (v_user_id, p_assessment_id, 'in_progress')
	returning id into v_attempt_id;

	return v_attempt_id;
end;
$$;

grant execute on function public.start_academy_attempt(uuid) to authenticated;
revoke insert, update, delete on public.academy_attempts from authenticated;

create or replace function public.save_academy_answers(
	p_attempt_id uuid,
	p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_assessment_id uuid;
	v_answer jsonb;
	v_question_id uuid;
	v_option_ids uuid[];
begin
	if v_user_id is null then
		raise exception 'No autenticado' using errcode = 'P0001';
	end if;

	select assessment_id into v_assessment_id
	from public.academy_attempts
	where id = p_attempt_id and user_id = v_user_id and status = 'in_progress';

	if not found then
		raise exception 'Intento no disponible' using errcode = 'P0002';
	end if;
	if jsonb_typeof(p_answers) <> 'array' then
		raise exception 'Respuestas inválidas' using errcode = 'P0003';
	end if;

	for v_answer in select value from jsonb_array_elements(p_answers)
	loop
		v_question_id := (v_answer ->> 'question_id')::uuid;
		v_option_ids := array(
			select value::uuid from jsonb_array_elements_text(v_answer -> 'selected_option_ids')
		);

		if not exists (
			select 1 from public.academy_questions
			where id = v_question_id and assessment_id = v_assessment_id and is_active
		) then
			raise exception 'Pregunta inválida' using errcode = 'P0004';
		end if;
		if exists (
			select 1
			from unnest(v_option_ids) option_id
			where not exists (
				select 1 from public.academy_question_options o
				where o.id = option_id and o.question_id = v_question_id
			)
		) then
			raise exception 'Opción inválida' using errcode = 'P0005';
		end if;
	end loop;

	delete from public.academy_answers where attempt_id = p_attempt_id;
	insert into public.academy_answers (attempt_id, question_id, selected_option_ids)
	select p_attempt_id,
				 (value ->> 'question_id')::uuid,
				 array(select option_id::uuid from jsonb_array_elements_text(value -> 'selected_option_ids') option_id)
	from jsonb_array_elements(p_answers);

	return jsonb_build_object('ok', true, 'count', jsonb_array_length(p_answers));
end;
$$;

grant execute on function public.save_academy_answers(uuid, jsonb) to authenticated;
revoke insert, update, delete on public.academy_answers from authenticated;
