-- =============================================================================
-- Migração 008 — funis do Pipeline de Leads viram dinâmicos (2026-09-06)
-- Rode isso no SQL Editor do Supabase (depois das migrações 001-007).
--
-- Pedido do usuário: poder criar funis (colunas) novos no Pipeline, além de
-- arrastar leads entre colunas e reordenar as próprias colunas. Antes,
-- `leads.status` era travado por CHECK numa lista fixa de 5 valores — dava
-- pra mudar o rótulo/cor no código, mas nunca adicionar uma coluna nova
-- sem alterar o banco. Agora vira uma tabela (`funis_lead`), e o CHECK vira
-- uma FOREIGN KEY.
--
-- `papel` marca os 3 estágios que o próprio sistema depende (lead novo
-- nasce em `papel='novo'`; os cartões de "Ganhos"/"Perdidos" do CRM somam
-- por `papel='ganho'`/`papel='perdido'`) — esses 3 não podem ser
-- excluídos (bloqueio na aplicação), mas podem ser renomeados/reordenados
-- como qualquer outro. Os demais funis (inclusive os 2 do meio que já
-- existiam) são livres pra renomear/excluir/reordenar.
-- =============================================================================

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

alter table funis_lead enable row level security;
create policy gestor_tudo on funis_lead for all using (eh_gestor()) with check (eh_gestor());

-- troca o CHECK fixo de leads.status por uma referência a funis_lead(id)
-- (acha o nome do constraint dinamicamente — nome default do Postgres pra
-- CHECK inline seria "leads_status_check", mas não depende disso).
do $$
declare c text;
begin
  select conname into c from pg_constraint
    where conrelid = 'leads'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%';
  if c is not null then
    execute format('alter table leads drop constraint %I', c);
  end if;
end $$;

alter table leads add constraint leads_status_fkey foreign key (status) references funis_lead(id) on delete restrict;
