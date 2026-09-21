-- =============================================================================
-- Migração 040 — Fundação multiempresa, Etapa 1 / Entrega 1.2 (2026-09-21).
--
-- Modela "quem pertence a qual empresa, com qual papel". Roda em PARALELO
-- com `gestores` (migration_030) — não remove nem altera essa tabela, só
-- espelha o estado dela numa forma nova. Nenhum comportamento hoje em
-- produção muda: `eh_gestor()` continua consultando só `gestores`, então
-- o RLS de todo o resto do sistema segue idêntico depois desta migração.
--
-- Semeia a Em Cena (criada na migração 039) com cada gestor que já existe
-- hoje, como papel 'admin' — dinâmico via `select` de `gestores`, não um
-- UUID fixo, então cobre qualquer gestor adicionado depois da 030 também.
-- =============================================================================

create table membros_empresa (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- só 'admin' por enquanto (mesmo poder de `gestores` hoje) — outros
  -- papéis (comercial/financeiro/operacional) entram na Etapa 3
  -- ("Usuários e permissões"), depois que a base de tenant estiver
  -- provada em produção.
  papel       text not null default 'admin' check (papel in ('admin')),
  criado_em   timestamptz not null default now(),
  unique (empresa_id, user_id)
);

insert into membros_empresa (empresa_id, user_id, papel)
select (select id from empresas where slug = 'em-cena'), g.id, 'admin'
from gestores g;

alter table membros_empresa enable row level security;

-- Cada gestor lê a própria linha de vínculo (é o que `AuthContext.tsx`
-- vai consultar pra resolver "qual é a minha empresa hoje" — Entrega 1.3)
-- — mesmo padrão de `funcionarios_internos.proprio_le` (migration_010).
create policy proprio_le on membros_empresa for select using (auth.uid() = user_id);

-- Gestor (de qualquer empresa, por enquanto — sem distinção ainda) lê
-- tudo, pra sustentar uma futura tela de administração de membros.
create policy gestor_le_membros on membros_empresa for select to authenticated using (eh_gestor());
