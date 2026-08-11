-- Diagassist clean baseline (account-free / ephemeral).
-- Replaces the tangled 57-migration history for a fresh, independent project.
-- No login => no auth foreign keys; access is open to the anon role.

create extension if not exists pgcrypto;

-- Async job/result store the frontend polls after an upload.
create table if not exists public.pdf_analyses (
  id                     text primary key default (gen_random_uuid())::text,
  user_id                text,                 -- anonymous per-browser id, may be null
  filename               text,
  pdf_path               text,
  status                 text not null default 'processing'
                           check (status in ('pending','processing','completed','failed')),
  result                 jsonb,
  error_message          text,
  admin_notified_success boolean not null default false,
  admin_notified_at      timestamptz,
  admin_alerted          boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists pdf_analyses_created_at_idx on public.pdf_analyses (created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_pdf_analyses_updated_at on public.pdf_analyses;
create trigger trg_pdf_analyses_updated_at
  before update on public.pdf_analyses
  for each row execute function public.set_updated_at();

alter table public.pdf_analyses enable row level security;
drop policy if exists "diagassist open pdf_analyses" on public.pdf_analyses;
create policy "diagassist open pdf_analyses"
  on public.pdf_analyses for all
  to anon, authenticated
  using (true) with check (true);

-- Private bucket for camera-captured report images. Wrapped so a restricted
-- storage schema can never abort the whole push; if skipped, the bucket can be
-- created from the dashboard instead.
do $$
begin
  begin
    insert into storage.buckets (id, name, public)
    values ('medical-reports', 'medical-reports', false)
    on conflict (id) do nothing;
  exception when insufficient_privilege then
    raise notice 'skipped storage.buckets insert (insufficient privilege)';
  end;

  begin
    execute 'drop policy if exists "diagassist medical-reports access" on storage.objects';
    execute 'create policy "diagassist medical-reports access" on storage.objects for all '
         || 'to anon, authenticated using (bucket_id = ''medical-reports'') '
         || 'with check (bucket_id = ''medical-reports'')';
  exception when insufficient_privilege then
    raise notice 'skipped storage.objects policy (insufficient privilege)';
  end;
end $$;
