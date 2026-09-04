create extension if not exists pg_cron with schema extensions;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'academy-expire-enrollments';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
  perform cron.schedule(
    'academy-expire-enrollments',
    '15 3 * * *',
    $cron$select public.expire_academy_enrollments();$cron$
  );
end;
$$;

comment on extension pg_cron is 'Ejecuta diariamente la expiración idempotente de accesos Academy.';
