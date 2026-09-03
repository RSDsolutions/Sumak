create or replace function public.issue_academy_course_certificate(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_course public.academy_courses;
	v_total_lessons integer;
	v_completed_lessons integer;
	v_certificate public.academy_certificates;
	v_name text;
begin
	if v_user_id is null then
		raise exception 'No autenticado' using errcode = 'P0001';
	end if;

	select * into v_course
	from public.academy_courses
	where id = p_course_id and status = 'published' and generates_certificate;
	if not found then
		raise exception 'Curso no elegible para certificado' using errcode = 'P0002';
	end if;

	if not exists (
		select 1 from public.academy_enrollments
		where user_id = v_user_id and course_id = p_course_id and status in ('active', 'completed')
	) then
		raise exception 'El usuario no está inscrito en el curso' using errcode = 'P0003';
	end if;

	select count(*) into v_total_lessons
	from public.academy_lessons l
	join public.academy_modules m on m.id = l.module_id
	where m.course_id = p_course_id and m.is_published and l.is_published;

	select count(*) into v_completed_lessons
	from public.academy_progress p
	join public.academy_lessons l on l.id = p.lesson_id
	join public.academy_modules m on m.id = l.module_id
	where p.user_id = v_user_id and p.course_id = p_course_id
		and m.course_id = p_course_id and m.is_published and l.is_published
		and p.status = 'completed';

	if v_total_lessons = 0 or v_completed_lessons < v_total_lessons then
		raise exception 'El curso aún no está completado' using errcode = 'P0004';
	end if;

	select nombre_completo into v_name from public.profiles where id = v_user_id;
	insert into public.academy_certificates (user_id, course_id, certificate_number, participant_name, course_name)
	values (v_user_id, p_course_id, public.academy_next_certificate_number(), coalesce(v_name, 'Participante'), v_course.title)
	on conflict (user_id, course_id) do update set course_name = excluded.course_name
	returning * into v_certificate;

	update public.academy_enrollments
	set status = 'completed', progress_percentage = 100, completed_at = coalesce(completed_at, now())
	where user_id = v_user_id and course_id = p_course_id;

	return to_jsonb(v_certificate);
end;
$$;

grant execute on function public.issue_academy_course_certificate(uuid) to authenticated;

create or replace function public.get_my_academy_certificates()
returns setof public.academy_certificates
language sql
security invoker
stable
set search_path = public
as $$
	select * from public.academy_certificates
	where user_id = auth.uid()
	order by issued_at desc;
$$;

grant execute on function public.get_my_academy_certificates() to authenticated;
