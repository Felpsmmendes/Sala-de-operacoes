-- =============================================================================
-- Migração 019 — Frete cobrado no orçamento (2026-09-09).
-- Rode isso no SQL Editor do Supabase (depois da 001-018).
--
-- Pedido do usuário: escolher região+veículo no Gerador de Orçamentos já
-- calcula o frete (mesma fórmula da calculadora de Logística) e SOMA esse
-- valor ao valor_total do orçamento — o frete passa a ser cobrado do
-- cliente, não só um custo interno.
--
-- Duas naturezas diferentes, guardadas separadas de propósito (decisão
-- confirmada com o usuário):
--   valor_frete_cobrado — o que o CLIENTE paga (já COM a margem de 30%,
--     entra no valor_total/sinal/saldo do orçamento normalmente).
--   valor_frete_custo   — o que a EMPRESA realmente gasta (SEM a margem),
--     vira despesa automática em Finanças só quando o orçamento virar
--     contrato de verdade (é quando existe um evento pra vincular a
--     despesa — ver criarContrato em src/lib/api/contratos.ts).
--
-- `regiao_frete_id`/`veiculo_id` ficam salvos só pra lembrar a escolha
-- (reabrir o orçamento pra editar mostra a região/veículo certos de
-- novo) — o valor em si não recalcula sozinho se a região mudar de
-- preço depois, mesmo raciocínio de `valor_unitario` nos itens.
-- =============================================================================

alter table orcamentos
  add column if not exists regiao_frete_id uuid references regioes_frete(id) on delete set null,
  add column if not exists veiculo_id uuid references veiculos(id) on delete set null,
  add column if not exists valor_frete_cobrado numeric(12,2) not null default 0 check (valor_frete_cobrado >= 0),
  add column if not exists valor_frete_custo numeric(12,2) not null default 0 check (valor_frete_custo >= 0);
