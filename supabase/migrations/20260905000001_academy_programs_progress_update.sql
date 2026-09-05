create or replace function public.get_my_program_progress(p_program_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    v_user_id uuid := auth.uid();
    v_required integer;
    v_completed integer;
    v_percentage numeric(5,2);
    v_courses jsonb;
    v_eligible boolean;
    v_program record;
begin
    if v_user_id is null then raise exception 'No autenticado' using errcode = 'P0001'; end if;
    select * into v_program from public.academy_programs where id = p_program_id and status = 'published';
    if not found then raise exception 'Programa no disponible' using errcode = 'P0002'; end if;
    
    select count(*) into v_required from public.academy_program_courses where program_id = p_program_id and is_required;
    
    select count(*) into v_completed from public.academy_program_courses pc 
    join public.academy_enrollments e on e.course_id = pc.course_id and e.user_id = v_user_id and e.status = 'completed' 
    where pc.program_id = p_program_id and pc.is_required;
    
    v_percentage := case when v_required = 0 then 0 else round((v_completed::numeric / v_required) * 100, 2) end;
    
    with course_status as (
        select 
            pc.id as program_course_id,
            pc.course_id,
            c.title,
            pc.is_required,
            pc.sort_order,
            coalesce(e.status, 'not_enrolled') as status,
            coalesce(e.progress_percentage, 0) as progress_percentage
        from public.academy_program_courses pc
        join public.academy_courses c on c.id = pc.course_id
        left join public.academy_enrollments e on e.course_id = pc.course_id and e.user_id = v_user_id
        where pc.program_id = p_program_id
    ),
    prereqs as (
        select 
            req.program_course_id,
            jsonb_agg(
                jsonb_build_object(
                    'prereq_program_course_id', req.prereq_program_course_id,
                    'prereq_course_id', prereq_pc.course_id,
                    'prereq_title', prereq_c.title,
                    'is_completed', coalesce(pe.status, 'not_enrolled') = 'completed'
                )
            ) as missing_prerequisites
        from public.academy_program_course_prereqs req
        join public.academy_program_courses prereq_pc on prereq_pc.id = req.prereq_program_course_id
        join public.academy_courses prereq_c on prereq_c.id = prereq_pc.course_id
        left join public.academy_enrollments pe on pe.course_id = prereq_pc.course_id and pe.user_id = v_user_id
        group by req.program_course_id
    )
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'program_course_id', cs.program_course_id,
                'course_id', cs.course_id,
                'title', cs.title,
                'is_required', cs.is_required,
                'status', cs.status,
                'progress_percentage', cs.progress_percentage,
                'is_locked', case 
                    when p.missing_prerequisites is not null and 
                         exists (select 1 from jsonb_array_elements(p.missing_prerequisites) as req where (req->>'is_completed')::boolean = false)
                    then true else false end,
                'prerequisites', coalesce(p.missing_prerequisites, '[]'::jsonb)
            ) order by cs.sort_order
        ), '[]'::jsonb
    ) into v_courses
    from course_status cs
    left join prereqs p on p.program_course_id = cs.program_course_id;

    v_eligible := v_required > 0 and v_percentage >= v_program.completion_percentage_required;
    
    return jsonb_build_object(
        'program_id', p_program_id,
        'required_courses', v_required,
        'completed_courses', v_completed,
        'percentage', v_percentage,
        'eligible', v_eligible,
        'courses', v_courses
    );
end;
$$;
