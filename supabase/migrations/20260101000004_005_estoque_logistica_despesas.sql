-- =============================================================================
-- Migração 005 — conecta Estoque ⇄ Logística de verdade, e prepara o
-- terreno pras despesas automáticas (frete/diária/compra) no DRE.
-- Rode isso no SQL Editor do Supabase (depois das migrações 001-004).
--
-- Vem da revisão de coerência geral pós-Fase 7: hoje o checklist padrão
-- e os itens do romaneio são só texto livre, sem ligação com os itens
-- reais de `estoque_itens` — embarcar um romaneio não descontava nada do
-- estoque de verdade. Não criamos um catálogo de estoque_itens
-- automático a partir do checklist (muita entrada mistura ingrediente
-- com equipamento/utensílio, ex. "Coquet(Pegador, Pá, macerador...)" —
-- viraria uma bagunça de SKU fabricado). Em vez disso, a ligação é
-- manual e gradual: o gestor vincula cada descrição do checklist a um
-- item real do estoque (novo ou existente) na tela de Estoque.
-- =============================================================================

alter table checklist_padrao_itens add column if not exists estoque_item_id uuid references estoque_itens(id) on delete set null;
alter table romaneio_itens add column if not exists estoque_item_id uuid references estoque_itens(id) on delete set null;

-- controla se este romaneio já debitou o estoque (idempotência — nunca
-- debitar duas vezes o mesmo romaneio mesmo que "Avançar fase" seja
-- clicado de novo ou a fase seja revisitada).
alter table romaneios add column if not exists estoque_baixado boolean not null default false;
