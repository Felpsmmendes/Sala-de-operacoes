-- =============================================================================
-- Migração 014 — Hora adicional por item do orçamento (2026-09-09).
-- Rode isso no SQL Editor do Supabase (depois da 001-013).
--
-- Pedido do usuário: cada item do orçamento (bar ou atração fotográfica)
-- pode levar horas além da duração padrão (5h pro bar, 4h pra atração),
-- cobradas à parte. Guardamos `horas_adicionais` (quantas horas) e
-- `valor_hora_adicional` (quanto vale 1h extra DESTE item, no momento em
-- que o orçamento foi montado) — não recalculamos na hora de exibir,
-- pelo mesmo motivo que `valor_unitario` já não recalcula: se o preço do
-- serviço mudar depois, o orçamento salvo continua mostrando o valor que
-- foi de fato proposto ao cliente.
--
-- `valor_unitario` (já existente) passa a vir com a hora extra somada
-- (base + horas_adicionais × valor_hora_adicional) — assim o
-- `valor_total` gerado (quantidade × valor_unitario) já soma tudo,
-- sem precisar mexer nessa coluna gerada.
-- =============================================================================

alter table orcamento_itens
  add column if not exists horas_adicionais numeric(4,2) not null default 0 check (horas_adicionais >= 0),
  add column if not exists valor_hora_adicional numeric(12,2) not null default 0 check (valor_hora_adicional >= 0);
