-- ============================================================
-- SUMAK — Migration 031 — Academy Recipes (Recetas Milenarias)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABLA: academy_recipes
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_image_url text,
  pdf_url text not null,
  price numeric(10,2) not null default 5.00,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists academy_recipes_updated_at on public.academy_recipes;
create trigger academy_recipes_updated_at
  before update on public.academy_recipes
  for each row execute function public.academy_set_updated_at();

alter table public.academy_recipes enable row level security;

-- Cualquiera puede ver las recetas activas
drop policy if exists "Recetas: lectura publica" on public.academy_recipes;
create policy "Recetas: lectura publica" on public.academy_recipes
  for select using (is_active or public.is_academy_staff());

-- Staff gestiona
drop policy if exists "Recetas: staff gestiona" on public.academy_recipes;
create policy "Recetas: staff gestiona" on public.academy_recipes
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 2. TABLA: academy_recipe_purchases
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_recipe_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'approved', 'rejected')),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  payment_method text not null default 'bank_transfer',
  payment_receipt_url text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists academy_recipe_purchases_updated_at on public.academy_recipe_purchases;
create trigger academy_recipe_purchases_updated_at
  before update on public.academy_recipe_purchases
  for each row execute function public.academy_set_updated_at();

alter table public.academy_recipe_purchases enable row level security;

-- Usuario lee sus propias compras
drop policy if exists "Compras: usuario lee las suyas" on public.academy_recipe_purchases;
create policy "Compras: usuario lee las suyas" on public.academy_recipe_purchases
  for select using (user_id = auth.uid() or public.is_academy_staff());

-- Usuario puede crear una compra
drop policy if exists "Compras: usuario crea" on public.academy_recipe_purchases;
create policy "Compras: usuario crea" on public.academy_recipe_purchases
  for insert with check (user_id = auth.uid());

-- Staff gestiona
drop policy if exists "Compras: staff gestiona" on public.academy_recipe_purchases;
create policy "Compras: staff gestiona" on public.academy_recipe_purchases
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 3. TABLA: academy_recipe_purchase_items
-- ─────────────────────────────────────────────────────────────
create table if not exists public.academy_recipe_purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.academy_recipe_purchases(id) on delete cascade,
  recipe_id uuid not null references public.academy_recipes(id) on delete cascade,
  price_at_purchase numeric(10,2) not null,
  created_at timestamptz not null default now(),
  unique(purchase_id, recipe_id)
);

alter table public.academy_recipe_purchase_items enable row level security;

-- Usuario lee sus items
drop policy if exists "Items: usuario lee los suyos" on public.academy_recipe_purchase_items;
create policy "Items: usuario lee los suyos" on public.academy_recipe_purchase_items
  for select using (
    public.is_academy_staff()
    or exists (
      select 1 from public.academy_recipe_purchases p
      where p.id = purchase_id and p.user_id = auth.uid()
    )
  );

-- Usuario inserta sus items
drop policy if exists "Items: usuario inserta" on public.academy_recipe_purchase_items;
create policy "Items: usuario inserta" on public.academy_recipe_purchase_items
  for insert with check (
    exists (
      select 1 from public.academy_recipe_purchases p
      where p.id = purchase_id and p.user_id = auth.uid() and p.status = 'pending'
    )
  );

-- Staff gestiona
drop policy if exists "Items: staff gestiona" on public.academy_recipe_purchase_items;
create policy "Items: staff gestiona" on public.academy_recipe_purchase_items
  for all using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ─────────────────────────────────────────────────────────────
-- 4. FUNCTION: has_recipe_access
-- ─────────────────────────────────────────────────────────────
create or replace function public.has_recipe_access(p_recipe_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if public.is_academy_staff() then
    return true;
  end if;
  
  -- Si el usuario compró la receta y el pago fue aprobado
  return exists (
    select 1 
    from public.academy_recipe_purchase_items i
    join public.academy_recipe_purchases p on p.id = i.purchase_id
    where i.recipe_id = p_recipe_id
      and p.user_id = auth.uid()
      and p.status = 'approved'
  );
end;
$$;

revoke all on function public.has_recipe_access(uuid) from public;
grant execute on function public.has_recipe_access(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. BUCKET DE PDFS PRIVADOS Y RECIBOS
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academy-recipes',
  'academy-recipes',
  false,     -- PRIVADO
  10485760,  -- 10MB
  array['application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academy-receipts',
  'academy-receipts',
  false,     -- PRIVADO
  5242880,   -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880;

-- Políticas de Storage para PDFs de recetas
drop policy if exists "recipes pdf lectura con acceso" on storage.objects;
create policy "recipes pdf lectura con acceso" on storage.objects
  for select using (
    bucket_id = 'academy-recipes' and (
      public.is_academy_staff()
      -- Validamos que si intenta descargar '{recipe_id}/archivo.pdf' tenga acceso
      or (
         array_length(string_to_array(name, '/'), 1) >= 2 
         and public.has_recipe_access( (string_to_array(name, '/'))[1]::uuid )
      )
    )
  );

drop policy if exists "recipes pdf staff upload" on storage.objects;
create policy "recipes pdf staff upload" on storage.objects
  for insert with check (bucket_id = 'academy-recipes' and public.is_academy_staff());

drop policy if exists "recipes pdf staff update" on storage.objects;
create policy "recipes pdf staff update" on storage.objects
  for update using (bucket_id = 'academy-recipes' and public.is_academy_staff())
  with check (bucket_id = 'academy-recipes' and public.is_academy_staff());

drop policy if exists "recipes pdf staff delete" on storage.objects;
create policy "recipes pdf staff delete" on storage.objects
  for delete using (bucket_id = 'academy-recipes' and public.is_academy_staff());


-- Políticas de Storage para recibos
drop policy if exists "receipts usuario propio" on storage.objects;
create policy "receipts usuario propio" on storage.objects
  for select using (
    bucket_id = 'academy-receipts' and (
      public.is_academy_staff()
      or (auth.uid()::text = (storage.foldername(name))[1])
    )
  );

drop policy if exists "receipts upload propio" on storage.objects;
create policy "receipts upload propio" on storage.objects
  for insert with check (
    bucket_id = 'academy-receipts'
    and (auth.uid()::text = (storage.foldername(name))[1])
  );
