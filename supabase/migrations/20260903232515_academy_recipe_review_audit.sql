create or replace function public.review_academy_recipe_purchase(
	p_purchase_id uuid,
	p_status text,
	p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_actor uuid := auth.uid();
	v_purchase public.academy_recipe_purchases;
begin
	if v_actor is null or not public.is_academy_staff() then
		raise exception 'No autorizado' using errcode = 'P0001';
	end if;
	if p_status not in ('approved', 'rejected') then
		raise exception 'Estado de revisión inválido' using errcode = 'P0002';
	end if;
	if p_status = 'rejected' and length(trim(coalesce(p_rejection_reason, ''))) < 5 then
		raise exception 'El rechazo requiere un motivo' using errcode = 'P0003';
	end if;

	update public.academy_recipe_purchases
	set status = p_status,
			approved_by = v_actor,
			approved_at = now(),
			rejection_reason = case when p_status = 'rejected' then trim(p_rejection_reason) else null end
	where id = p_purchase_id and status in ('pending', 'processing')
	returning * into v_purchase;

	if not found then
		raise exception 'Compra no disponible para revisión' using errcode = 'P0004';
	end if;

	insert into public.academy_audit_logs (actor_id, action, entity_type, entity_id, metadata)
	values (v_actor, 'recipe_purchase_reviewed', 'recipe_purchase', p_purchase_id,
		jsonb_build_object('status', p_status, 'user_id', v_purchase.user_id, 'total_amount', v_purchase.total_amount,
			'rejection_reason', case when p_status = 'rejected' then v_purchase.rejection_reason else null end));

	return jsonb_build_object('id', v_purchase.id, 'status', v_purchase.status, 'approved_at', v_purchase.approved_at);
end;
$$;

grant execute on function public.review_academy_recipe_purchase(uuid, text, text) to authenticated;
revoke update, delete on public.academy_recipe_purchases from authenticated;
revoke update, delete on public.academy_recipe_purchase_items from authenticated;

drop policy if exists "receipts usuario propio" on storage.objects;
create policy "receipts usuario propio" on storage.objects
	for select using (
		bucket_id = 'academy-receipts' and (
			public.is_academy_staff()
			or exists (
				select 1 from public.academy_recipe_purchases p
				where p.user_id = auth.uid() and p.payment_receipt_url = name
			)
		)
	);

drop policy if exists "receipts upload propio" on storage.objects;
create policy "receipts upload propio" on storage.objects
	for insert with check (
		bucket_id = 'academy-receipts'
		and array_length(storage.foldername(name), 1) = 1
		and (storage.foldername(name))[1] = auth.uid()::text
	);

drop policy if exists "receipts staff delete" on storage.objects;
create policy "receipts staff delete" on storage.objects
	for delete using (bucket_id = 'academy-receipts' and public.is_academy_staff());
