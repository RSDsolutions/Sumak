create or replace function public.academy_audit_content_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
	v_id uuid := nullif(v_row ->> 'id', '')::uuid;
begin
	insert into public.academy_audit_logs (actor_id, action, entity_type, entity_id, metadata)
	values (auth.uid(), lower(tg_op) || '_' || tg_table_name, 'academy_content', v_id,
		jsonb_build_object('table', tg_table_name, 'operation', tg_op, 'row', v_row));
	return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
	v_table text;
begin
	foreach v_table in array array[
		'academy_courses', 'academy_modules', 'academy_lessons',
		'academy_resources', 'academy_assessments', 'academy_questions',
		'academy_question_options', 'academy_live_sessions', 'academy_programs',
		'academy_program_courses'
	] loop
		execute format('drop trigger if exists academy_audit_content_change on public.%I', v_table);
		execute format('create trigger academy_audit_content_change after insert or update or delete on public.%I for each row execute function public.academy_audit_content_change()', v_table);
	end loop;
end $$;
