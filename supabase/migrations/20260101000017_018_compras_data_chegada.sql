-- =============================================================================
-- Migração 018 — Data de chegada prevista da compra (2026-09-09).
-- Rode isso no SQL Editor do Supabase (depois da 001-017).
--
-- Pedido do usuário: a seção "Compras chegando" (agora na tela de
-- Logística, antes só listada em Estoque) ordena as compras pendentes por
-- previsão de chegada — precisa desse campo pra existir.
-- =============================================================================

alter table compras add column if not exists data_chegada_prevista date;
