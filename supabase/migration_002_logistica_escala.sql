-- =============================================================================
-- Migração 002 — ajustes de Logística (frete real) + checklist padrão de carga
-- Rode isso no SQL Editor do Supabase (depois de schema.sql + seed.sql).
-- =============================================================================

-- 1. corrige a margem padrão (30%, não 35% — conferido contra a planilha real
--    de frete e contra o painel antigo, os dois usam 30%)
alter table romaneios alter column margem_pct set default 0.30;
update romaneios set margem_pct = 0.30 where margem_pct = 0.35;

-- 2. campos que faltavam pro cálculo real de frete (pedágio, barman de carro,
--    Lalamove/transporte extra) — mesma fórmula da planilha
--    "Calculadora_de_Frete_Em_Cena_Eventos.xlsx"
alter table romaneios add column if not exists pedagios numeric(10,2) not null default 0 check (pedagios >= 0);
alter table romaneios add column if not exists qtd_barmen_carro integer not null default 0 check (qtd_barmen_carro >= 0);
alter table romaneios add column if not exists pedagios_barmen numeric(10,2) not null default 0 check (pedagios_barmen >= 0);
alter table romaneios add column if not exists valor_lalamove numeric(10,2) not null default 0 check (valor_lalamove >= 0);
alter table romaneios add column if not exists motivo_lalamove text;

-- valor_frete deixa de ser coluna gerada (a fórmula agora depende do tipo do
-- veículo pra saber gasolina x diesel, o que uma generated column não
-- resolve sozinha) — passa a ser calculado em app e gravado aqui.
alter table romaneios drop column if exists valor_frete;
alter table romaneios add column if not exists valor_frete numeric(10,2) not null default 0;

-- 3. checklist padrão de carga por tipo de serviço (bar/atração) e faixa de
--    convidados — dado real, migrado das planilhas de checklist da empresa.
--    Ao criar um romaneio pra um evento, o app sugere os itens daqui de
--    acordo com o(s) serviço(s) contratado(s) e o número de convidados.
create table if not exists checklist_padrao_itens (
  id              uuid primary key default gen_random_uuid(),
  servico_id      uuid not null references servicos(id) on delete cascade,
  convidados_min  integer,             -- null = sem mínimo
  convidados_max  integer,             -- null = sem máximo
  descricao       text not null,
  quantidade      numeric(10,2) not null default 1,
  unidade         text,
  criado_em       timestamptz not null default now()
);
create index if not exists idx_checklist_padrao_servico on checklist_padrao_itens(servico_id);

alter table checklist_padrao_itens enable row level security;
drop policy if exists gestor_tudo on checklist_padrao_itens;
create policy gestor_tudo on checklist_padrao_itens for all using (eh_gestor()) with check (eh_gestor());
