-- =============================================================================
-- Migração 021 — Horários do evento no contrato (2026-09-09).
-- Rode isso no SQL Editor do Supabase (depois da 001-020).
--
-- Pedido do usuário: campos de horário usados depois no Roteiro do Evento
-- ("Etapa 8", ainda não construída) — só preparando o dado aqui, o
-- consumo em si fica pra quando essa tela existir.
--
-- 4 campos sempre visíveis (qualquer contrato, com ou sem orçamento de
-- origem) ficam em `contratos`. "Início do bar" também — é UM campo só
-- por contrato (não um por pacote de bar). "Início de cada atração" é
-- POR ITEM (pode ter 2+ atrações no mesmo contrato) — por isso vai em
-- `orcamento_itens`, não em `contratos`: contrato sem orçamento de
-- origem (criado do zero) simplesmente não tem itens pra mostrar esse
-- campo, o que já é o comportamento certo (não tem como saber quantas
-- atrações sem um orçamento por trás).
-- =============================================================================

alter table contratos
  add column if not exists horario_chegada_convidados time,
  add column if not exists horario_chegada_equipe time,
  add column if not exists horario_fim_servico time,
  add column if not exists horario_saida_equipe time,
  add column if not exists horario_inicio_bar time;

alter table orcamento_itens
  add column if not exists horario_inicio_atracao time;
