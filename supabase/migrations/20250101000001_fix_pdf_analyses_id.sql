-- The analysis functions generate their own string ids (e.g. "analysis_..._abc"),
-- so pdf_analyses.id must be TEXT, not UUID. Safe on an empty table; the camera
-- path that omits an id still gets a generated default.
alter table public.pdf_analyses alter column id drop default;
alter table public.pdf_analyses alter column id type text using id::text;
alter table public.pdf_analyses alter column id set default (gen_random_uuid())::text;
