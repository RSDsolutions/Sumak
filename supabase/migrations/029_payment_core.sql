-- Centralized payment ledger for bank transfer, PayPal, Payphone and future provider integrations.
-- This table is the source-of-truth for transaction_id, provider, status and amounts.
-- The frontend must never write to this table directly; server-side processes (Edge Functions / admin jobs)
-- are responsible for creating and verifying records.

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pedido_id uuid references public.pedidos(id) on delete set null,
  afiliacion_id uuid references public.afiliaciones(id) on delete set null,
  provider text not null check (provider in ('payphone', 'paypal', 'bank_transfer')),
  payment_method text not null check (payment_method in ('payphone', 'paypal', 'bank_transfer')),
  transaction_id text,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'USD',
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'pending_verification', 'approved', 'rejected', 'cancelled', 'expired')
  ),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists pagos_transaction_unique
  on public.pagos (provider, transaction_id)
  where transaction_id is not null;

create index if not exists pagos_user_id_idx
  on public.pagos (user_id);

create index if not exists pagos_pedido_id_idx
  on public.pagos (pedido_id);

create index if not exists pagos_afiliacion_id_idx
  on public.pagos (afiliacion_id);

create index if not exists pagos_status_idx
  on public.pagos (status);

alter table public.pagos enable row level security;

create policy "Users can read own payment records"
on public.pagos
for select
using (user_id = auth.uid() or public.is_admin());

create policy "Users can insert own payment records"
on public.pagos
for insert
with check (user_id = auth.uid());

create policy "Admins can manage all payment records"
on public.pagos
for all
using (public.is_admin())
with check (public.is_admin());

create or replace function public.set_pagos_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_pagos_updated_at on public.pagos;
create trigger trg_set_pagos_updated_at
before update on public.pagos
for each row
execute function public.set_pagos_updated_at();

comment on table public.pagos is 'Central payment ledger for all Sumak payment methods. The client should never mark orders paid; server-side verification is required.';
comment on column public.pagos.provider is 'Provider used by the payment gateway (paypal, bank_transfer, payphone).';
comment on column public.pagos.payment_method is 'Frontend-facing payment method shown to users (same values as provider for current integrations).';
comment on column public.pagos.transaction_id is 'External idempotency key or gateway transaction reference used to prevent duplicate payments.';
comment on column public.pagos.metadata is 'Additional provider metadata such as order id, redirect url, capture result, etc.';
