create or replace function public.create_academy_recipe_purchase(
	p_recipe_ids uuid[],
	p_payment_method text,
	p_payment_receipt_url text,
	p_banco_destino text,
	p_voucher_numero text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_purchase public.academy_recipe_purchases;
	v_total numeric(10,2);
begin
	if v_user_id is null then raise exception 'No autenticado' using errcode = 'P0001'; end if;
	if p_recipe_ids is null or cardinality(p_recipe_ids) = 0 then raise exception 'Debe seleccionar al menos una receta' using errcode = 'P0002'; end if;
	if p_payment_method is null or length(trim(p_payment_method)) = 0 then raise exception 'Método de pago inválido' using errcode = 'P0003'; end if;
	if exists (select 1 from unnest(p_recipe_ids) ids group by ids having count(*) > 1) then raise exception 'Recetas duplicadas' using errcode = 'P0004'; end if;

	select coalesce(sum(price), 0)::numeric(10,2) into v_total
	from public.academy_recipes
	where id = any(p_recipe_ids) and is_active;
	if (select count(*) from public.academy_recipes where id = any(p_recipe_ids) and is_active) <> cardinality(p_recipe_ids) then
		raise exception 'Una o más recetas no están disponibles' using errcode = 'P0005';
	end if;

	insert into public.academy_recipe_purchases (user_id, total_amount, payment_method, payment_receipt_url, banco_destino, voucher_numero, status)
	values (v_user_id, v_total, trim(p_payment_method), nullif(trim(p_payment_receipt_url), ''), nullif(trim(p_banco_destino), ''), nullif(trim(p_voucher_numero), ''), 'pending')
	returning * into v_purchase;

	insert into public.academy_recipe_purchase_items (purchase_id, recipe_id, price_at_purchase)
	select v_purchase.id, r.id, r.price
	from public.academy_recipes r
	where r.id = any(p_recipe_ids) and r.is_active;

	return jsonb_build_object('purchase_id', v_purchase.id, 'total_amount', v_total, 'status', v_purchase.status);
end;
$$;

grant execute on function public.create_academy_recipe_purchase(uuid[], text, text, text, text) to authenticated;
revoke insert, update, delete on public.academy_recipe_purchases from authenticated;
revoke insert, update, delete on public.academy_recipe_purchase_items from authenticated;
