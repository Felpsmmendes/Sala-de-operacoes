-- =============================================================================
-- Sala de Operações — Em Cena Eventos
-- Schema Postgres (Supabase) — Fase 1 (fundação técnica)
-- -----------------------------------------------------------------------------
-- Cobre os 5 núcleos do PRD: Comercial, Planejamento, Execução, Encerramento,
-- Controladoria. Convenções:
--   - uuid como chave primária (gen_random_uuid(), extensão pgcrypto).
--   - "criado_em"/"atualizado_em" timestamptz default now() em toda tabela.
--   - Nunca duplicar dado entre tabelas — sempre referenciar por FK (mesmo
--     princípio do painel anterior, ver ../../Texto/docs/ARQUITETURA.md).
--   - RLS habilitado em tudo. Só o GESTOR (usuário autenticado) tem acesso
--     de leitura/escrita geral. A única exceção é `portal_cliente`, que
--     também aceita acesso público (anon) restrito por token — é assim que
--     o cliente (noivo/contratante) acessa sem login (ver README).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Função utilitária: RLS "só o gestor".
--
-- ⚠️ SEGURANÇA (achado de auditoria, 2026-09-06): `auth.role() =
-- 'authenticated'` sozinho dá acesso total a QUALQUER conta autenticada,
-- não só a do gestor. Isso só é seguro enquanto o cadastro público
-- (self-signup) estiver desabilitado no projeto (Authentication →
-- Providers → Email → "Allow new users to sign up" = OFF) E nenhuma
-- conta extra existir. Definição de bootstrap (fresh install, antes da
-- conta do gestor existir) — assim que criar a conta real, troque para
-- travar num usuário específico, IGUAL a `supabase/migration_007_seguranca.sql`:
--   select auth.uid() = '<uuid do usuário gestor>'::uuid;
-- (o uuid aparece em Authentication → Users no painel do Supabase, ou no
-- retorno de POST /auth/v1/token?grant_type=password).
-- -----------------------------------------------------------------------------
create or replace function eh_gestor() returns boolean
language sql stable as $$
  select auth.role() = 'authenticated';
$$;

-- =============================================================================
-- NÚCLEO 1 — COMERCIAL & HOMOLOGAÇÃO
-- =============================================================================

-- Colunas do Pipeline de Leads ("funis") — tabela em vez de enum/CHECK fixo
-- pra dar pra criar/renomear/reordenar/excluir funil pela tela (pedido do
-- usuário: Kanban de verdade). `papel` marca os 3 estágios que o próprio
-- sistema depende (lead novo nasce aqui; os cartões "Ganhos"/"Perdidos" do
-- CRM somam por papel) — só esses 3 não podem ser excluídos.
create table funis_lead (
  id          text primary key,
  nome        text not null,
  cor         text not null default 'neutro' check (cor in ('sucesso','pendente','perigo','neutro')),
  ordem       integer not null,
  papel       text check (papel in ('novo','ganho','perdido')),
  criado_em   timestamptz not null default now()
);

insert into funis_lead (id, nome, cor, ordem, papel) values
  ('novo',                 'Novo',                 'neutro',   0, 'novo'),
  ('degustacao_agendada',  'Degustação agendada',  'pendente', 1, null),
  ('proposta_enviada',     'Proposta enviada',     'pendente', 2, null),
  ('contrato_fechado',     'Contrato fechado',     'sucesso',  3, 'ganho'),
  ('perdido',              'Perdido',              'perigo',   4, 'perdido');

create table leads (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  telefone        text,
  email           text,
  origem          text,
  status          text not null default 'novo' references funis_lead(id) on delete restrict,
  valor_estimado  numeric(12,2) check (valor_estimado >= 0),
  observacoes     text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- Canal de conversa/contato do lead — histórico de mensagem/ligação/
-- reunião/nota, como todo CRM de mercado tem. A mensagem de WhatsApp do
-- orçamento se registra sozinha aqui quando gerada; o resto é manual.
create table lead_interacoes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  tipo        text not null check (tipo in ('mensagem_whatsapp','ligacao','email','reuniao','nota')),
  conteudo    text not null,
  criado_em   timestamptz not null default now()
);
create index idx_lead_interacoes_lead on lead_interacoes(lead_id);

-- catálogo de serviços — pacotes de bar + atrações fotográficas, reaproveitado
-- em orçamentos e contratos (nunca duplicar valor/descrição em outra tabela).
create table servicos (
  id                  uuid primary key default gen_random_uuid(),
  categoria           text not null check (categoria in ('bar','atracao','adicional')),
  nome                text not null,
  descricao           text,
  valor_base          numeric(12,2) not null check (valor_base >= 0),
  valor_por_convidado numeric(12,2) check (valor_por_convidado >= 0), -- null = valor fixo, não por pax
  ativo               boolean not null default true
);

create table orcamentos (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null references leads(id) on delete restrict,
  data_evento    date,
  convidados     integer check (convidados > 0),
  valor_total    numeric(12,2) not null default 0 check (valor_total >= 0),
  valor_sinal    numeric(12,2) generated always as (round(valor_total * 0.20, 2)) stored,
  valor_saldo    numeric(12,2) generated always as (round(valor_total * 0.80, 2)) stored,
  status         text not null default 'rascunho' check (status in ('rascunho','enviado','aprovado','recusado')),
  criado_em      timestamptz not null default now()
);

create table orcamento_itens (
  id              uuid primary key default gen_random_uuid(),
  orcamento_id    uuid not null references orcamentos(id) on delete cascade,
  servico_id      uuid not null references servicos(id) on delete restrict,
  quantidade      integer not null default 1 check (quantidade > 0),
  valor_unitario  numeric(12,2) not null check (valor_unitario >= 0),
  valor_total     numeric(12,2) generated always as (quantidade * valor_unitario) stored
);

-- Hub de Contratos & Faturamento 20/80.
-- Regra inviolável (PRD): saldo (80%) deve estar quitado até D-7 do evento —
-- validado em aplicação/edge function, não em constraint (data de hoje muda
-- todo dia; CHECK não acompanha isso).
create table contratos (
  id                uuid primary key default gen_random_uuid(),
  orcamento_id      uuid references orcamentos(id) on delete set null,
  lead_id           uuid not null references leads(id) on delete restrict,
  data_evento       date not null,
  local             text,
  convidados        integer check (convidados > 0),
  valor_total       numeric(12,2) not null check (valor_total > 0),
  valor_sinal       numeric(12,2) generated always as (round(valor_total * 0.20, 2)) stored,
  sinal_pago        boolean not null default false,
  sinal_pago_em     date,
  valor_saldo       numeric(12,2) generated always as (round(valor_total * 0.80, 2)) stored,
  saldo_status      text not null default 'pendente' check (saldo_status in ('pendente','parcial','quitado')),
  saldo_pago_em     date,
  chave_pix         text,
  status            text not null default 'ativo' check (status in ('ativo','cancelado','concluido')),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index idx_contratos_data_evento on contratos(data_evento);

-- Portal do Cliente: acesso PÚBLICO via token (sem login). Trava D-15
-- calculada a partir de contratos.data_evento, verificada em app/edge
-- function no momento da escrita (constraint não acompanha "hoje").
create table portal_cliente (
  id                 uuid primary key default gen_random_uuid(),
  contrato_id        uuid not null unique references contratos(id) on delete cascade,
  token              uuid not null unique default gen_random_uuid(),
  coquetel_ids       uuid[] not null default '{}',   -- até 5 servico_id (categoria='bar')
  moldura_arquivo_url text,
  moldura_aprovada   boolean not null default false,
  video_arquivo_url  text,
  video_aprovado     boolean not null default false,
  assinatura_nome    text,
  assinatura_cpf     text,
  assinatura_hash    text,          -- sha256 do conteúdo homologado, gerado na aprovação
  assinatura_ip      text,
  assinatura_em      timestamptz,
  criado_em          timestamptz not null default now()
);

-- =============================================================================
-- NÚCLEO 2 — PLANEJAMENTO & PRÉ-PRODUÇÃO
-- =============================================================================

create table estoque_itens (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  categoria          text not null check (categoria in ('bebida','insumo','gelo','descartavel','outro')),
  unidade            text not null,                 -- 'garrafa', 'kg', 'saco', 'unid'...
  estoque_atual      numeric(12,2) not null default 0 check (estoque_atual >= 0),
  estoque_minimo     numeric(12,2) not null default 0 check (estoque_minimo >= 0),
  consumo_por_pax    numeric(10,4),                 -- null = item não escala por convidado
  atualizado_em      timestamptz not null default now()
);

-- evento fica definido no núcleo 3 (execução), mas movimento de estoque já
-- referencia `eventos` — a tabela é criada logo abaixo, então o FK entra
-- depois via ALTER (ver seção "FKs cruzados" ao final).
create table estoque_movimentos (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references estoque_itens(id) on delete restrict,
  tipo           text not null check (tipo in ('entrada','saida','avaria','reintegracao')),
  quantidade     numeric(12,2) not null check (quantidade > 0),
  evento_id      uuid,  -- FK adicionado ao final (references eventos)
  observacao     text,
  criado_em      timestamptz not null default now()
);

create table compras (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references estoque_itens(id) on delete restrict,
  quantidade     numeric(12,2) not null check (quantidade > 0),
  valor_total    numeric(12,2) not null check (valor_total >= 0),
  status         text not null default 'pendente' check (status in ('pendente','recebido','cancelado')),
  criado_em      timestamptz not null default now()
);

-- Cadastro de freelancers. NÃO tem login (decisão registrada — só o gestor
-- autentica no sistema, ver README). Serve pra identificar quem foi
-- convocado/escalado/bateu ponto, sem precisar de conta própria.
create table equipe (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  funcao      text not null check (funcao in ('head_bartender','bartender','barback','tecnico_imagem','motorista','outro')),
  telefone    text,
  chave_pix   text,
  ativo       boolean not null default true
);

create table veiculos (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,        -- "Caminhão Baú", "Sedan Operacional #02"
  placa          text,
  tipo           text not null check (tipo in ('caminhao','sedan','van')),
  consumo_medio  numeric(6,2),         -- km/l
  km_atual       numeric(10,1)
);

-- =============================================================================
-- NÚCLEO 3 — EXECUÇÃO EM TEMPO REAL (NO AR / MADRUGADA)
-- =============================================================================

create table eventos (
  id                  uuid primary key default gen_random_uuid(),
  contrato_id         uuid not null references contratos(id) on delete restrict,
  data_evento         date not null,
  hora_inicio         time,
  hora_fim_prevista   time,
  local               text,
  tipo_evento         text,
  convidados          integer check (convidados > 0),
  status              text not null default 'agendado'
                        check (status in ('agendado','em_montagem','em_execucao','encerrado','cancelado')),
  canal_radio         text,           -- "CH-01 [VHF 154.2]" — texto livre, sem integração real de rádio
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);
create index idx_eventos_data_evento on eventos(data_evento);

create table escalas (
  id              uuid primary key default gen_random_uuid(),
  evento_id       uuid not null references eventos(id) on delete cascade,
  membro_id       uuid not null references equipe(id) on delete restrict,
  diaria          numeric(10,2) not null check (diaria >= 0),
  status          text not null default 'convocado' check (status in ('convocado','confirmado','recusado')),
  confirmado_em   timestamptz,
  traje_ok        boolean not null default false,
  epi_ok          boolean not null default false,
  unique (evento_id, membro_id)
);

create table cue_sheet_itens (
  id             uuid primary key default gen_random_uuid(),
  evento_id      uuid not null references eventos(id) on delete cascade,
  numero         integer not null check (numero > 0),
  horario        time not null,
  titulo         text not null,
  descricao      text,
  concluido      boolean not null default false,
  concluido_em   timestamptz,
  unique (evento_id, numero)
);

-- Checklist padrão de carga por tipo de serviço (bar/atração) e faixa de
-- convidados — dado real, migrado das planilhas de checklist da empresa.
-- Ao criar um romaneio pra um evento, o app sugere os itens daqui de
-- acordo com o(s) serviço(s) contratado(s) e o número de convidados.
create table checklist_padrao_itens (
  id                uuid primary key default gen_random_uuid(),
  servico_id        uuid not null references servicos(id) on delete cascade,
  convidados_min    integer,             -- null = sem mínimo
  convidados_max    integer,             -- null = sem máximo
  descricao         text not null,
  quantidade        numeric(10,2) not null default 1,
  unidade           text,
  -- null = ainda não vinculado a um item real do estoque (a maioria das
  -- 356 linhas migradas do checklist real mistura ingrediente com
  -- utensílio/equipamento — vínculo é manual e gradual, feito pelo
  -- gestor em Estoque, nunca um catálogo fabricado automaticamente).
  estoque_item_id   uuid references estoque_itens(id) on delete set null,
  criado_em         timestamptz not null default now()
);
create index idx_checklist_padrao_servico on checklist_padrao_itens(servico_id);

-- Frete calculado com a fórmula real da empresa (mesma da planilha
-- "Calculadora de Frete" e do painel antigo): combustível (por tipo de
-- veículo) + ajuda de custo de barman indo de carro + pedágios + Lalamove,
-- com margem sobre o custo real e um frete mínimo — tudo calculado em app
-- (não dá pra fazer só com generated column porque depende do tipo do
-- veículo pra saber gasolina x diesel).
create table romaneios (
  id                 uuid primary key default gen_random_uuid(),
  evento_id          uuid not null references eventos(id) on delete cascade,
  veiculo_id         uuid not null references veiculos(id) on delete restrict,
  fase               text not null default 'separado'
                       check (fase in ('separado','embarcado','descarregado','devolvido')),
  km_ida_volta       numeric(8,1) check (km_ida_volta >= 0),
  pedagios           numeric(10,2) not null default 0 check (pedagios >= 0),
  combustivel_valor  numeric(10,2) check (combustivel_valor >= 0),
  qtd_barmen_carro   integer not null default 0 check (qtd_barmen_carro >= 0),
  pedagios_barmen    numeric(10,2) not null default 0 check (pedagios_barmen >= 0),
  valor_lalamove     numeric(10,2) not null default 0 check (valor_lalamove >= 0),
  motivo_lalamove    text,
  margem_pct         numeric(4,3) not null default 0.30 check (margem_pct >= 0),
  valor_frete        numeric(10,2) not null default 0,
  -- true depois que o embarque já debitou o estoque real (ver
  -- `avancarFaseRomaneio` em src/lib/api/logistica.ts) — evita debitar
  -- duas vezes o mesmo romaneio.
  estoque_baixado    boolean not null default false,
  atualizado_em      timestamptz not null default now()
);

create table romaneio_itens (
  id              uuid primary key default gen_random_uuid(),
  romaneio_id     uuid not null references romaneios(id) on delete cascade,
  descricao       text not null,
  quantidade      numeric(10,2) not null check (quantidade > 0),
  -- copiado do checklist_padrao_itens.estoque_item_id no momento em que
  -- o romaneio é criado (se o item padrão já estava vinculado) — null
  -- se o item não tinha ligação com um estoque real ainda.
  estoque_item_id uuid references estoque_itens(id) on delete set null,
  fase_conferida  text not null default 'separado'
                    check (fase_conferida in ('separado','embarcado','descarregado','devolvido'))
);

-- Ponto Eletrônico & Geocerca. `dentro_geocerca` é calculado no momento do
-- registro (fórmula de Haversine no app) e gravado — não recalculado depois,
-- é evidência do que aconteceu, igual ao "atrasado" do painel anterior nunca
-- ser confiado como estado gravável de outra forma.
create table ponto_registros (
  id                 uuid primary key default gen_random_uuid(),
  membro_id          uuid not null references equipe(id) on delete restrict,
  evento_id          uuid not null references eventos(id) on delete restrict,
  tipo               text not null check (tipo in ('entrada','inicio_intervalo','fim_intervalo','saida')),
  horario            timestamptz not null default now(),
  latitude           numeric(9,6),
  longitude          numeric(9,6),
  distancia_metros   numeric(8,1),     -- distância calculada até o local do evento
  dentro_geocerca    boolean not null default false
);

-- =============================================================================
-- NÚCLEO 4 — ENCERRAMENTO & AUDITORIA
-- =============================================================================

create table auditoria_pos_evento (
  id                     uuid primary key default gen_random_uuid(),
  evento_id              uuid not null unique references eventos(id) on delete cascade,
  sobras_reintegradas    boolean not null default false,
  avarias_descricao      text,
  avarias_valor          numeric(10,2) check (avarias_valor >= 0),
  foto_doca_url          text,
  nps_nota               integer check (nps_nota between 0 and 10),
  nps_comentario         text,
  criado_em              timestamptz not null default now()
);

-- =============================================================================
-- NÚCLEO 5 — CONTROLADORIA & SAÚDE FINANCEIRA
-- =============================================================================

create table lancamentos_financeiros (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null check (tipo in ('receita','despesa')),
  evento_id       uuid references eventos(id) on delete set null, -- null = despesa/receita geral
  descricao       text not null,
  valor           numeric(12,2) not null check (valor > 0),
  vencimento      date,
  status          text not null default 'pendente' check (status in ('pendente','pago')),
  data_pagamento  date,
  observacoes     text,
  criado_em       timestamptz not null default now(),
  constraint pagamento_precisa_data check (
    (status = 'pago' and data_pagamento is not null) or
    (status = 'pendente' and data_pagamento is null)
  )
);
create index idx_lancamentos_vencimento on lancamentos_financeiros(vencimento);

-- Fechamento Mensal & DRE: NÃO é tabela própria — é uma VIEW que agrega
-- lancamentos_financeiros por mês. Segue o princípio de nunca duplicar
-- dado; "lucro líquido do mês" é sempre calculado, nunca gravado à parte.
create view dre_mensal as
select
  date_trunc('month', coalesce(data_pagamento, vencimento, criado_em::date))::date as mes,
  sum(valor) filter (where tipo = 'receita') as receita_bruta,
  sum(valor) filter (where tipo = 'despesa') as custos_totais,
  sum(valor) filter (where tipo = 'receita') - sum(valor) filter (where tipo = 'despesa') as lucro_liquido
from lancamentos_financeiros
where status = 'pago'
group by 1
order by 1 desc;

-- =============================================================================
-- FKs CRUZADOS (declarados depois porque `eventos` só existe no núcleo 3)
-- =============================================================================
alter table estoque_movimentos
  add constraint fk_estoque_movimentos_evento foreign key (evento_id) references eventos(id) on delete set null;

-- =============================================================================
-- ROW LEVEL SECURITY — só o gestor (usuário autenticado) lê/escreve, exceto
-- `portal_cliente` que também libera `anon` de forma restrita (o cliente
-- final acessa por token, sem login — ver README).
-- =============================================================================
do $$
declare
  tabela text;
begin
  for tabela in
    select unnest(array[
      'funis_lead','leads','lead_interacoes','servicos','orcamentos','orcamento_itens','contratos',
      'estoque_itens','estoque_movimentos','compras','equipe','veiculos',
      'eventos','escalas','cue_sheet_itens','romaneios','romaneio_itens',
      'checklist_padrao_itens',
      'ponto_registros','auditoria_pos_evento','lancamentos_financeiros'
    ])
  loop
    execute format('alter table %I enable row level security', tabela);
    execute format('create policy gestor_tudo on %I for all using (eh_gestor()) with check (eh_gestor())', tabela);
  end loop;
end $$;

-- portal_cliente: gestor tem acesso total. Público (anon) NÃO tem policy
-- nem grant direto na tabela — todo acesso de fora passa por função RPC
-- `security definer` (abaixo), que exige o token como parâmetro e nunca
-- permite listar ou alterar mais de uma linha por chamada (achado de
-- auditoria, 2026-09-06 — `using (true)` sem RPC deixava listar/editar
-- TODAS as linhas numa chamada de API sem filtro nenhum).
alter table portal_cliente enable row level security;
create policy gestor_tudo on portal_cliente for all using (eh_gestor()) with check (eh_gestor());

-- =============================================================================
-- PONTO ELETRÔNICO SIMPLIFICADO — sem geofence/PIN (decisão do usuário).
-- Freelancer confirma chegada por link público (`/ponto/:eventoId`, sem
-- login) escolhendo o próprio nome entre os escalados do evento. Não expõe
-- `escalas.diaria` (dado de pagamento) nem valida identidade — é só
-- visibilidade operacional de quem já chegou, pro gestor ver janelas com
-- falta de gente confirmada.
-- =============================================================================
create or replace view vw_escala_presenca as
select
  esc.id           as escala_id,
  esc.evento_id,
  esc.membro_id,
  eq.nome          as membro_nome,
  eq.funcao        as membro_funcao,
  esc.status       as status_escala,
  ev.data_evento,
  ev.local,
  (
    select max(pr.horario)
    from ponto_registros pr
    where pr.membro_id = esc.membro_id and pr.evento_id = esc.evento_id and pr.tipo = 'entrada'
  ) as chegada_em
from escalas esc
join equipe eq on eq.id = esc.membro_id
join eventos ev on ev.id = esc.evento_id
where esc.status <> 'recusado';

-- só `authenticated` (gestor) tem select direto na view — `anon` só
-- acessa via RPC (abaixo), scoped por evento_id, nunca listagem geral.
grant select on vw_escala_presenca to authenticated;

create or replace function ponto_obter_presenca(p_evento_id uuid)
returns setof vw_escala_presenca
language sql stable security definer set search_path = public as $$
  select * from vw_escala_presenca where evento_id = p_evento_id;
$$;
revoke all on function ponto_obter_presenca(uuid) from public;
grant execute on function ponto_obter_presenca(uuid) to anon, authenticated;

create or replace function ponto_registrar_chegada(p_evento_id uuid, p_membro_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from escalas where evento_id = p_evento_id and membro_id = p_membro_id) then
    raise exception 'Membro não está escalado para este evento';
  end if;
  insert into ponto_registros (evento_id, membro_id, tipo) values (p_evento_id, p_membro_id, 'entrada');
end;
$$;
revoke all on function ponto_registrar_chegada(uuid, uuid) from public;
grant execute on function ponto_registrar_chegada(uuid, uuid) to anon, authenticated;

-- =============================================================================
-- PORTAL DO CLIENTE — view pública com os campos não sensíveis de
-- contratos/leads (nunca valor_total/sinal/saldo/chave_pix), pra tela
-- `/portal/:token` conseguir mostrar data/local/nome do evento sem
-- precisar de acesso direto às tabelas travadas pro gestor. Igual ao
-- Ponto: `anon` só acessa via RPC, nunca select/update direto.
-- =============================================================================
create or replace view vw_portal_publico as
select
  pc.id,
  pc.token,
  pc.contrato_id,
  pc.coquetel_ids,
  pc.moldura_arquivo_url,
  pc.moldura_aprovada,
  pc.video_arquivo_url,
  pc.video_aprovado,
  pc.assinatura_nome,
  pc.assinatura_cpf,
  pc.assinatura_em,
  c.data_evento,
  c.local,
  l.nome as lead_nome
from portal_cliente pc
join contratos c on c.id = pc.contrato_id
join leads l on l.id = c.lead_id;

grant select on vw_portal_publico to authenticated;

create or replace function portal_obter(p_token uuid)
returns setof vw_portal_publico
language sql stable security definer set search_path = public as $$
  select * from vw_portal_publico where token = p_token;
$$;
revoke all on function portal_obter(uuid) from public;
grant execute on function portal_obter(uuid) to anon, authenticated;

create or replace function portal_aprovar_moldura(p_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update portal_cliente set moldura_aprovada = true where token = p_token;
end;
$$;
revoke all on function portal_aprovar_moldura(uuid) from public;
grant execute on function portal_aprovar_moldura(uuid) to anon, authenticated;

create or replace function portal_aprovar_video(p_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update portal_cliente set video_aprovado = true where token = p_token;
end;
$$;
revoke all on function portal_aprovar_video(uuid) from public;
grant execute on function portal_aprovar_video(uuid) to anon, authenticated;

create or replace function portal_assinar(p_token uuid, p_nome text, p_cpf text, p_hash text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update portal_cliente
    set assinatura_nome = p_nome, assinatura_cpf = p_cpf, assinatura_hash = p_hash, assinatura_em = now()
    where token = p_token;
end;
$$;
revoke all on function portal_assinar(uuid, text, text, text) from public;
grant execute on function portal_assinar(uuid, text, text, text) to anon, authenticated;
