-- =============================================================================
-- Migração 022 — Itens extras do checklist de carga, vindos de
-- "Observações / brindes" do contrato (2026-09-09).
-- Rode isso no SQL Editor do Supabase (depois da 001-021).
--
-- Pedido do usuário ("Etapa 7"): cada linha de `contratos.observacoes_brindes`
-- (ver migration_020) vira um item extra no checklist de carga daquele
-- evento, quantidade padrão 1, editável. Guardado numa tabela própria (não
-- só derivado do texto na hora) porque a quantidade editada precisa
-- sobreviver a uma nova sincronização — se só recalculássemos do texto
-- toda vez, qualquer edição de quantidade se perderia no próximo save das
-- observações. `unique (contrato_id, descricao)` é o que permite
-- sincronizar sem duplicar: mesma descrição já existente mantém a
-- quantidade que o gestor editou, só descrições novas entram com 1, e
-- descrições removidas do texto são apagadas daqui.
-- =============================================================================

create table contrato_checklist_extra (
  id          uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  descricao   text not null,
  quantidade  numeric(10,2) not null default 1 check (quantidade > 0),
  criado_em   timestamptz not null default now(),
  unique (contrato_id, descricao)
);

alter table contrato_checklist_extra enable row level security;
create policy gestor_tudo on contrato_checklist_extra for all using (eh_gestor()) with check (eh_gestor());
