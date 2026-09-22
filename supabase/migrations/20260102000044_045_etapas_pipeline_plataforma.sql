-- =============================================================================
-- Migração 045 — Pipeline de prospecção editável (2026-09-21).
--
-- A migration_043 deixou as etapas do funil FIXAS (CHECK em
-- `leads_plataforma.etapa`) — "uso de uma pessoa só, não precisa de UI". Na
-- prática o funil precisa ser ajustado (criar/renomear/reordenar/remover
-- etapas). Aqui as etapas viram tabela e o CHECK vira chave estrangeira.
--
-- Nenhum lead muda: as 7 etapas antigas entram com o MESMO id que já estava
-- gravado em `leads_plataforma.etapa` ('lead', 'contato', …), então todo lead
-- existente continua apontando pra etapa certa.
--
-- `papel` marca as duas etapas especiais que o resto do painel entende:
-- 'ganho' (virou cliente) e 'perdido'. No máximo UMA de cada (índice único) e
-- as demais (papel null) são "em aberto" — é o que conta pro funil e pros
-- números do Dashboard.
-- =============================================================================

create table etapas_plataforma (
  id         text primary key,
  nome       text not null check (char_length(btrim(nome)) > 0),
  ordem      integer not null default 0,
  papel      text check (papel in ('ganho', 'perdido')),
  criado_em  timestamptz not null default now()
);

create unique index uq_etapas_plataforma_papel on etapas_plataforma (papel) where papel is not null;

insert into etapas_plataforma (id, nome, ordem, papel) values
  ('lead',         'Lead',         0, null),
  ('contato',      'Contato',      1, null),
  ('demonstracao', 'Demonstração', 2, null),
  ('proposta',     'Proposta',     3, null),
  ('negociacao',   'Negociação',   4, null),
  ('ganho',        'Ganho',        5, 'ganho'),
  ('perdido',      'Perdido',      6, 'perdido');

-- CHECK fixo → FK. `on delete restrict`: não dá pra apagar uma etapa que ainda
-- tem lead (a tela pede pra mover os leads antes); `on update cascade` por
-- garantia, caso um id de etapa precise mudar.
alter table leads_plataforma drop constraint leads_plataforma_etapa_check;
alter table leads_plataforma
  add constraint leads_plataforma_etapa_fkey foreign key (etapa) references etapas_plataforma (id) on update cascade on delete restrict;

alter table etapas_plataforma enable row level security;
create policy super_admin_tudo on etapas_plataforma for all to authenticated using (eh_super_admin()) with check (eh_super_admin());
