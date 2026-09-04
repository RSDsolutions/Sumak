-- ============================================================
-- SUMAK - Migration 20260904113000 - Add Onboarding to Profiles
-- ============================================================
-- Agrega has_completed_onboarding a la tabla profiles para 
-- gestionar el estado del tour guiado a nivel de base de datos.
-- ============================================================

alter table public.profiles
add column if not exists has_completed_onboarding boolean default false;

-- Los usuarios antiguos no deben ver el tour repetidas veces
-- Marcamos como true a todos los que se registraron antes de hoy.
update public.profiles
set has_completed_onboarding = true
where fecha_registro < now() - interval '1 day';
