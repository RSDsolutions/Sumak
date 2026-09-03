create or replace function public.verify_diploma_public(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
	v_diploma record;
begin
	if p_token is null or length(p_token) < 10 then
		return jsonb_build_object('found', false, 'status', 'NOT_FOUND');
	end if;

	select d.diploma_number, d.verification_code, d.participant_name, d.program_name,
		d.status, d.issued_at, dt.name as diploma_type_name, d.revoked_at
	into v_diploma
	from public.academy_diploma_issuances d
	join public.academy_diploma_types dt on dt.id = d.diploma_type_id
	where d.verification_token = p_token;

	if not found then
		return jsonb_build_object('found', false, 'status', 'NOT_FOUND');
	end if;

	return jsonb_build_object(
		'found', true,
		'status', upper(v_diploma.status),
		'diploma_number', v_diploma.diploma_number,
		'verification_code', v_diploma.verification_code,
		'participant_name', v_diploma.participant_name,
		'program_name', v_diploma.program_name,
		'diploma_type', v_diploma.diploma_type_name,
		'issued_at', v_diploma.issued_at,
		'issuer', 'SUMAK Ecuador',
		'revoked_at', v_diploma.revoked_at
	);
end;
$$;

revoke all on function public.verify_diploma_public(text) from public;
grant execute on function public.verify_diploma_public(text) to anon, authenticated;
