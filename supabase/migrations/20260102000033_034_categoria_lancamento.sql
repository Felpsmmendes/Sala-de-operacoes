-- Migration 034 — Categoria livre nos lançamentos financeiros
-- (pedido do usuário, 2026-09-14: "não dá pra saber quanto foi de
-- equipe/insumos/frete no total de despesas do mês, só o total bruto").
-- Texto livre (não enum) de propósito — sugestões vêm só da UI
-- (datalist), sem travar o gestor numa lista fixa que sempre fica curta
-- pra realidade do negócio.

alter table lancamentos_financeiros
  add column if not exists categoria text;
