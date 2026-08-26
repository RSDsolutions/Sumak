-- Store the same transfer details collected by the platform checkout.
alter table public.academy_recipe_purchases
  add column if not exists banco_destino text,
  add column if not exists voucher_numero text;