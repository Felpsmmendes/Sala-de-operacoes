-- =============================================================================
-- Migração 036 — Disponibilidade da equipe (2026-09-19).
-- Rode isso no SQL Editor do Supabase (depois da 001-035).
--
-- SPEC_CAMADA2 2D ("Equipe expandida") — antes não tinha como o gestor
-- registrar que um freelancer está indisponível numa data (viagem, outro
-- compromisso etc.) antes de convocar. 1 linha por dia marcado (dia sem
-- linha = disponível por padrão, nunca precisa cadastrar todo mundo pra
-- todo dia só pra dizer "disponível").
-- =============================================================================

create table disponibilidade_equipe (
  id          uuid primary key default gen_random_uuid(),
  membro_id   uuid not null references equipe(id) on delete cascade,
  data        date not null,
  disponivel  boolean not null default true,
  observacao  text,
  criado_em   timestamptz not null default now(),
  unique (membro_id, data)
);
create index idx_disponibilidade_equipe_membro on disponibilidade_equipe(membro_id);

alter table disponibilidade_equipe enable row level security;
create policy gestor_tudo on disponibilidade_equipe for all using (eh_gestor()) with check (eh_gestor());
