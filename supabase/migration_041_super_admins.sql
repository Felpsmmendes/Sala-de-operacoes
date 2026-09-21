-- =============================================================================
-- Migração 041 — Painel da plataforma, restrito ao dono do SaaS (2026-09-21).
--
-- Pedido do usuário: um jeito de acompanhar quantas empresas estão usando
-- o sistema e qual o plano de cada uma — só pra ELE (o desenvolvedor/dono
-- da plataforma), nunca pros gestores de cada empresa. Explicitamente
-- SEM acesso aos dados de negócio de cada empresa (leads, contratos,
-- financeiro etc.) — só à tabela `empresas` (nome/plano/status), que já
-- não guarda nada operacional.
--
-- Por isso este é um papel NOVO e separado de `eh_gestor()`/`gestores`:
-- um gestor de uma empresa (inclusive um futuro 2º gestor da Em Cena)
-- NUNCA deve enxergar a lista de outras empresas só por ser gestor da
-- sua. `eh_super_admin()` só é usada aqui e em `empresas` — nunca deve
-- ser adicionada à política de nenhuma tabela de negócio (leads,
-- contratos, estoque etc.), de propósito.
-- =============================================================================

create table super_admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text,
  criado_em   timestamptz not null default now()
);

-- Semeado com quem já é gestor hoje (na prática, só você) — mesmo
-- raciocínio de `migration_040`: dinâmico via select, não um UUID fixo.
-- Se um dia existir um 2º gestor que NÃO deva ver o painel da
-- plataforma, é só remover a linha dele aqui manualmente (SQL Editor) —
-- mesmo padrão de gerenciamento manual e deliberado de `gestores`.
insert into super_admins (id, nome)
select id, nome from gestores;

alter table super_admins enable row level security;

-- Só o próprio super admin lê a lista (nem todo gestor deveria saber
-- quem mais administra a plataforma).
create policy proprio_le_super_admins on super_admins for select using (auth.uid() = id);

create or replace function eh_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from super_admins where id = auth.uid());
$$;

-- ---------- plano/status de cada empresa (só o que o painel precisa) ----------
alter table empresas add column plano text not null default 'essencial' check (plano in ('essencial', 'profissional', 'enterprise'));
alter table empresas add column status text not null default 'ativa' check (status in ('ativa', 'trial', 'suspensa'));

-- ---------- aperta a política de `empresas` (migration_039) ----------
-- Antes usava `eh_gestor()` — como só existia 1 empresa, não vazava nada
-- na prática, mas era a política errada: um gestor normal nunca deveria
-- ler a lista de TODAS as empresas. Troca pra duas políticas separadas:
drop policy if exists leitura_gestor on empresas;

-- 1) o super admin lê qualquer empresa (é o painel da plataforma).
create policy leitura_super_admin on empresas for select to authenticated using (eh_super_admin());

-- 2) qualquer membro lê APENAS a própria empresa (ex.: `AuthContext.tsx`
-- resolvendo `empresaAtual` pra um gestor comum, que não é super admin —
-- ver Entrega 1.3, migration_040). Nunca enxerga as outras linhas.
create policy leitura_propria_empresa on empresas for select to authenticated using (
  exists (select 1 from membros_empresa where membros_empresa.empresa_id = empresas.id and membros_empresa.user_id = auth.uid())
);

-- só o super admin edita plano/status — a própria empresa só visualiza.
create policy edicao_super_admin on empresas for update to authenticated using (eh_super_admin()) with check (eh_super_admin());
