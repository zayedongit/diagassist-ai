-- analyze-medical-report writes admin_notified_at on success.
alter table public.pdf_analyses add column if not exists admin_notified_at timestamptz;
