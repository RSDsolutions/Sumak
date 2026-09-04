alter table public.academy_diploma_issuances
	add column if not exists registration_source text not null default 'automatic'
		check (registration_source in ('automatic', 'manual_qr')),
	add column if not exists original_pdf_path text,
	add column if not exists verified_pdf_path text,
	add column if not exists qr_generated_at timestamptz,
	add column if not exists verification_token_hash text;

create unique index if not exists academy_diploma_verification_token_hash_idx
	on public.academy_diploma_issuances (verification_token_hash)
	where verification_token_hash is not null;

create index if not exists academy_diploma_registration_source_idx
	on public.academy_diploma_issuances (registration_source);

comment on column public.academy_diploma_issuances.registration_source is
	'automatic = generador existente; manual_qr = registro de PDF existente con verificación QR.';
comment on column public.academy_diploma_issuances.original_pdf_path is
	'Ruta privada del PDF original. Nunca debe entregarse en verificación pública.';
comment on column public.academy_diploma_issuances.verified_pdf_path is
	'Ruta privada del PDF derivado con QR.';
comment on column public.academy_diploma_issuances.verification_token_hash is
	'SHA-256 del token de verificación del registro manual.';
