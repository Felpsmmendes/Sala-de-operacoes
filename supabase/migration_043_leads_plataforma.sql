-- =============================================================================
-- Migração 043 — CRM de prospecção da plataforma (2026-09-21).
--
-- Página 2 do mockup ("CRM — Possíveis clientes"). Isso NÃO é o CRM de
-- cada empresa (aquele é `leads`/`funis_lead` — dado do NEGÓCIO da
-- empresa, vai ganhar `tenant_id` na Etapa 2 de isolamento). Isto aqui
-- é o funil de VENDAS DO PRÓPRIO SAAS: empresas ainda nem são tenant,
-- então não tem `empresa_id` nenhum — só existe depois de virar cliente
-- de verdade (aí sim vira uma linha em `empresas`, cadastrada à mão por
-- enquanto, ver migration_042).
--
-- Mesmo escopo de acesso do painel da plataforma inteiro: só
-- `super_admins` (nunca gestor de empresa nenhuma).
--
-- Etapas fixas (não uma tabela configurável tipo `funis_lead`) — é uso
-- de uma pessoa só, não precisa de UI de configuração de funil pra
-- isso; se um dia precisar reordenar/renomear etapa, edita aqui.
-- =============================================================================

create table leads_plataforma (
  id                uuid primary key default gen_random_uuid(),
  nome_empresa      text not null,
  contato_nome      text,
  contato_telefone  text,
  contato_email     text,
  origem            text,
  etapa             text not null default 'lead' check (etapa in ('lead', 'contato', 'demonstracao', 'proposta', 'negociacao', 'ganho', 'perdido')),
  plano_interesse   text check (plano_interesse in ('essencial', 'profissional', 'enterprise')),
  valor_potencial   numeric(10,2) check (valor_potencial >= 0),
  observacoes       text,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

create table leads_plataforma_interacoes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads_plataforma(id) on delete cascade,
  tipo        text not null check (tipo in ('mensagem_whatsapp', 'ligacao', 'email', 'reuniao', 'nota')),
  conteudo    text not null,
  criado_em   timestamptz not null default now()
);
create index idx_leads_plataforma_interacoes_lead on leads_plataforma_interacoes (lead_id);

alter table leads_plataforma enable row level security;
alter table leads_plataforma_interacoes enable row level security;

create policy super_admin_tudo on leads_plataforma for all to authenticated using (eh_super_admin()) with check (eh_super_admin());
create policy super_admin_tudo on leads_plataforma_interacoes for all to authenticated using (eh_super_admin()) with check (eh_super_admin());
