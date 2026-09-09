-- =============================================================================
-- Migração 020 — Forma de pagamento + observações/brindes do contrato
-- (2026-09-09). Rode isso no SQL Editor do Supabase (depois da 001-019).
--
-- Pedido do usuário: registro manual de qual forma de pagamento foi usada
-- (PIX/Boleto/Cartão) — sem gerar boleto real nem link de pagamento, isso
-- fica pra uma integração futura com o Asaas, ainda não implementada.
--
-- `observacoes_brindes`: texto livre (cada quebra de linha vira um item
-- extra no checklist de carga do evento). A CONEXÃO com o checklist
-- depende de uma etapa de Estoque que o usuário chamou de "Etapa 7" —
-- não existe nada com esse nome no código nem no ROADMAP.md hoje, então
-- só o campo é criado aqui; a ligação fica pendente até essa etapa
-- existir (avisado ao usuário na resposta desta migração).
-- =============================================================================

alter table contratos
  add column if not exists forma_pagamento text check (forma_pagamento in ('pix', 'boleto', 'cartao')),
  add column if not exists observacoes_brindes text;
