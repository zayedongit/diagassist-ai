-- ============================================================================
-- DiagAssist RAG layer: pgvector knowledge base + precomputed retrieval cache.
-- India-first medical reference corpus for grounding abnormal-finding explanations.
-- ============================================================================

create extension if not exists vector;

-- --------------------------------------------------------------------------
-- kb_chunks: the retrievable, embedded reference corpus.
--   source_tier: 1 = India (ICMR / NIN), 2 = global guideline (WHO/ADA/AHA/KDIGO),
--                3 = patient-friendly (MedlinePlus), 4 = terminology (LOINC)
-- --------------------------------------------------------------------------
create table if not exists public.kb_chunks (
  id            bigserial primary key,
  content       text not null,
  embedding     vector(768),                         -- Gemini text-embedding-004
  source        text not null,
  source_tier   smallint not null default 3,
  region        text not null default 'global',       -- 'IN' | 'global'
  title         text,
  url           text,
  guideline     text,
  analyte_tags  text[] not null default '{}',
  tsv           tsvector generated always as (to_tsvector('english', content)) stored,
  created_at    timestamptz default now()
);

create index if not exists kb_chunks_embedding_idx on public.kb_chunks
  using hnsw (embedding vector_cosine_ops);
create index if not exists kb_chunks_tsv_idx  on public.kb_chunks using gin (tsv);
create index if not exists kb_chunks_tags_idx on public.kb_chunks using gin (analyte_tags);

-- Reference content is non-sensitive and public; allow read.
alter table public.kb_chunks enable row level security;
drop policy if exists "kb_chunks read" on public.kb_chunks;
create policy "kb_chunks read" on public.kb_chunks for select using (true);

-- --------------------------------------------------------------------------
-- retrieval_cache: precomputed top-k chunk ids for known (analyte, direction)
-- keys, e.g. 'ldl:high'. The online path is a lookup, not a live vector search.
-- Written by the ingestion script (service role); read by the edge function
-- (service role) — no anon policy needed.
-- --------------------------------------------------------------------------
create table if not exists public.retrieval_cache (
  key         text primary key,          -- '<analyte>:<direction>'
  chunk_ids   bigint[] not null,
  updated_at  timestamptz default now()
);
alter table public.retrieval_cache enable row level security;

-- --------------------------------------------------------------------------
-- match_kb_chunks: live vector search, used only on cache MISS in the edge
-- function. Returns the nearest chunks by cosine similarity.
-- --------------------------------------------------------------------------
create or replace function public.match_kb_chunks(
  query_embedding vector(768),
  match_count int default 6
)
returns table (
  id bigint,
  content text,
  source text,
  source_tier smallint,
  region text,
  title text,
  url text,
  analyte_tags text[],
  similarity float
)
language sql stable as $$
  select
    c.id, c.content, c.source, c.source_tier, c.region, c.title, c.url, c.analyte_tags,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.kb_chunks c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
