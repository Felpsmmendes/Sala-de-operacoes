-- =============================================================================
-- Migração 027 — Automações do CRM em fluxo visual (canvas), reescrita em
-- 2026-09-13 a pedido do usuário ("igual o Wesales, totalmente
-- personalizado" → editor tipo Zapier/n8n, não mais 1 gatilho + 1 ação).
--
-- Se você já rodou uma versão ANTERIOR desta migração (tabelas
-- `automacoes_crm`/`automacoes_execucoes` no formato antigo), os drops
-- abaixo limpam tudo — não existe dado de produção nelas ainda, então não
-- tem migração de dado a fazer. Rode isso no SQL Editor do Supabase,
-- DEPOIS de:
--
--   1. Fazer o (re)deploy da Edge Function `aplicar-automacoes-tempo`:
--        npx supabase functions deploy aplicar-automacoes-tempo --no-verify-jwt
--
-- Modelo: um FLUXO é um grafo — 1 nó `gatilho` (entrada) + qualquer
-- sequência de nós `condicao`/`espera`/`acao` ligados por conexões. O
-- gestor desenha isso no canvas (aba "Automações" do CRM); nada aqui é
-- fixo no código.
--
--   - nó `gatilho`      → só existe 1 por fluxo, sempre o nó de entrada.
--                         `lead_criado`/`mudanca_funil` disparam na hora,
--                         direto no app (Crm.tsx: aoCriar/aoMoverLead).
--                         `tempo_sem_contato` não tem "evento" (é
--                         ausência de contato ao longo do tempo) — o
--                         cron abaixo varre os leads 1x/dia procurando
--                         quem passou do limite.
--   - nó `condicao`     → 2 saídas (conexões com origem_handle 'sim'/
--                         'nao') — avalia contra o lead no momento em
--                         que a execução chega nele.
--   - nó `espera`       → pausa a execução por N dias antes de seguir
--                         pro próximo nó — é o cron que retoma.
--   - nó `acao`         → mesmas 4 ações de antes (mover funil, nota,
--                         tarefa, WhatsApp).
--
-- `automacoes_execucoes` é o estado de UMA passagem de UM lead por UM
-- fluxo — fica "presa" num nó de espera até `aguardando_ate` passar. O
-- índice único parcial garante só 1 execução ATIVA por (fluxo, lead) —
-- evita disparar o mesmo fluxo duas vezes em paralelo pro mesmo lead.
-- =============================================================================

drop table if exists automacoes_execucoes;
drop table if exists automacoes_conexoes;
drop table if exists automacoes_nos;
drop table if exists automacoes_crm;
drop table if exists automacoes_fluxos;

create table automacoes_fluxos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table automacoes_nos (
  id          uuid primary key default gen_random_uuid(),
  fluxo_id    uuid not null references automacoes_fluxos(id) on delete cascade,
  tipo        text not null check (tipo in ('gatilho', 'condicao', 'espera', 'acao')),
  pos_x       double precision not null default 0,
  pos_y       double precision not null default 0,
  dados       jsonb not null default '{}'::jsonb
);
create index automacoes_nos_fluxo_idx on automacoes_nos(fluxo_id);

create table automacoes_conexoes (
  id              uuid primary key default gen_random_uuid(),
  fluxo_id        uuid not null references automacoes_fluxos(id) on delete cascade,
  origem_no_id    uuid not null references automacoes_nos(id) on delete cascade,
  destino_no_id   uuid not null references automacoes_nos(id) on delete cascade,
  origem_handle   text check (origem_handle in ('sim', 'nao'))
);
create index automacoes_conexoes_fluxo_idx on automacoes_conexoes(fluxo_id);
create index automacoes_conexoes_origem_idx on automacoes_conexoes(origem_no_id);

create table automacoes_execucoes (
  id              uuid primary key default gen_random_uuid(),
  fluxo_id        uuid not null references automacoes_fluxos(id) on delete cascade,
  lead_id         uuid not null references leads(id) on delete cascade,
  no_atual_id     uuid references automacoes_nos(id) on delete set null,
  status          text not null default 'ativo' check (status in ('ativo', 'concluido', 'erro')),
  aguardando_ate  timestamptz,
  erro_mensagem   text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create index automacoes_execucoes_fluxo_idx on automacoes_execucoes(fluxo_id);
create index automacoes_execucoes_lead_idx on automacoes_execucoes(lead_id);
create index automacoes_execucoes_aguardando_idx on automacoes_execucoes(aguardando_ate) where status = 'ativo';
-- só 1 execução ATIVA por (fluxo, lead) — evita rodar o mesmo fluxo em
-- paralelo pro mesmo lead; uma vez concluída/com erro, pode rodar de novo.
create unique index automacoes_execucoes_ativa_unica on automacoes_execucoes(fluxo_id, lead_id) where status = 'ativo';

alter table automacoes_fluxos enable row level security;
alter table automacoes_nos enable row level security;
alter table automacoes_conexoes enable row level security;
alter table automacoes_execucoes enable row level security;

-- só o gestor desenha/lê fluxos — a Edge Function do cron usa a service
-- role key (ignora RLS por padrão), o app usa a sessão normal do gestor.
create policy gestor_gerencia_fluxos on automacoes_fluxos for all to authenticated
  using (eh_gestor()) with check (eh_gestor());
create policy gestor_gerencia_nos on automacoes_nos for all to authenticated
  using (eh_gestor()) with check (eh_gestor());
create policy gestor_gerencia_conexoes on automacoes_conexoes for all to authenticated
  using (eh_gestor()) with check (eh_gestor());
create policy gestor_le_execucoes on automacoes_execucoes for select to authenticated
  using (eh_gestor());

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'aplicar-automacoes-tempo-diario',
  '5 11 * * *', -- 8h05 em São Paulo (5 min depois do alerta-trava-d15, pra não competir)
  $$
  select net.http_post(
    url := 'https://ugnworqdnensqfzrxahk.supabase.co/functions/v1/aplicar-automacoes-tempo',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
