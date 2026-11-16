
-- ============================================================
-- SUMAK - Migration 20260905000003 - Academy Credentials Unification
-- ============================================================
-- Unifies certificates and diplomas into academy_diploma_issuances.
-- ============================================================

-- 1. Add credential_type to academy_diploma_issuances
alter table public.academy_diploma_issuances
  add column if not exists credential_type text not null default 'diploma'
  check (credential_type in ('certificate', 'diploma'));

-- 2. Add program_id to academy_diploma_issuances
alter table public.academy_diploma_issuances
  add column if not exists program_id uuid references public.academy_programs(id) on delete restrict;

-- 3. Make diploma_type_id and template_id nullable (certificates might not have them initially, though we can assign default ones)
alter table public.academy_diploma_issuances
  alter column diploma_type_id drop not null,
  alter column template_id drop not null,
  alter column document_hash drop not null,
  alter column pdf_storage_path drop not null,
  alter column template_version drop not null,
  alter column program_name drop not null;

-- 4. Add course_name if missing
alter table public.academy_diploma_issuances
  add column if not exists course_name text;

-- 5. Create new certificate sequence
create sequence if not exists public.academy_certificate_seq
  start with 1 increment by 1 no cycle;

-- 6. Migrate existing academy_certificates to academy_diploma_issuances
insert into public.academy_diploma_issuances (
  credential_type,
  diploma_number,
  verification_code,
  verification_token,
  user_id,
  course_id,
  participant_name,
  course_name,
  status,
  issued_at,
  metadata
)
select 
  'certificate',
  c.certificate_number,
  upper(substr(md5(random()::text), 1, 16)), -- pseudo random for old
  md5(random()::text || c.id::text), -- pseudo random token for old
  c.user_id,
  c.course_id,
  c.participant_name,
  c.course_name,
  'valid',
  c.issued_at,
  c.metadata
from public.academy_certificates c
on conflict do nothing;

-- 7. Drop the old table (Wait, we can keep it for a while but it's better to drop or rename to backup)
-- We will rename it to backup to be safe
alter table if exists public.academy_certificates rename to _backup_academy_certificates;
