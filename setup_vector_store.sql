-- 1. Habilitar la extensión para vectores (pgvector)
create extension if not exists vector;

-- 2. Crear la tabla de conocimiento
create table if not exists codebase_embeddings (
  id bigint primary key generated always as identity,
  project text not null,      -- 'lavaseco-app' o 'hydra-web'
  file_path text not null,    -- ruta relativa del archivo
  content text not null,      -- contenido del código
  embedding vector(768),      -- Dimensiones del modelo de Google (text-embedding-004)
  metadata jsonb,             -- Informacion extra (imports, functions)
  created_at timestamptz default now()
);

-- 3. Crear índice para búsqueda rápida (IVFFlat)
-- NOTA: Esto es opcional al inicio, pero bueno para performance
create index on codebase_embeddings using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 4. Función de búsqueda semántica (RPC)
create or replace function match_codebase (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  project text,
  file_path text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    codebase_embeddings.id,
    codebase_embeddings.project,
    codebase_embeddings.file_path,
    codebase_embeddings.content,
    1 - (codebase_embeddings.embedding <=> query_embedding) as similarity
  from codebase_embeddings
  where 1 - (codebase_embeddings.embedding <=> query_embedding) > match_threshold
  order by codebase_embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;
