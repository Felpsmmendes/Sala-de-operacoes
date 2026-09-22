-- =============================================================================
-- Migração 016 — Remove a estrutura de romaneio (2026-09-09).
-- Rode isso no SQL Editor do Supabase (depois da 001-015).
--
-- Pedido do usuário: a tela de Logística deixa de rastrear carga por 4
-- fases (separado/embarcado/descarregado/devolvido) — vira uma
-- calculadora de frete simples (veículo + região) sem vínculo com evento.
-- Decisão explícita do usuário (confirmada antes desta migração): apagar
-- as tabelas de vez, mesmo que já tenham dados reais de eventos passados
-- — não é só parar de usar, é remover mesmo.
--
-- ATENÇÃO: isso é destrutivo — qualquer romaneio/item de romaneio já
-- registrado é perdido pra sempre. Sem como desfazer depois de rodar.
--
-- `romaneio_itens` primeiro (referencia `romaneios`).
-- =============================================================================

drop table if exists romaneio_itens;
drop table if exists romaneios;
