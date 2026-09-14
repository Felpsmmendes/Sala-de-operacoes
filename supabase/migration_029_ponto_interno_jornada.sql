-- =============================================================================
-- Migração 029 — Jornada padrão + valor/hora por funcionário interno
-- (pedido do usuário, 2026-09-13 — "ponto eletrônico mais detalhado:
-- horas a pagar, horário normal de chegada, hora extra"). Rode isso
-- DEPOIS da migration_010_ponto_interno.sql (que cria as 2 tabelas base).
--
-- Decisões do usuário:
--   - "Horas a pagar" é valor em R$, não só soma de horas — por isso os
--     2 campos de valor/hora (normal e extra, o gestor cadastra os dois
--     à mão, sem multiplicador automático fixo).
--   - Jornada é CADASTRADA POR FUNCIONÁRIO (entrada/saída esperada), não
--     uma regra única pra empresa toda — cada um pode ter horário
--     diferente.
--   - SEM tolerância — qualquer minuto além do horário esperado já conta
--     como atraso/hora extra (o cálculo em si vive no app, em
--     src/pages/PontoInterno.tsx; estas colunas só guardam a config).
--
-- Todos os 4 campos são opcionais (null = jornada ainda não configurada
-- pro funcionário — o relatório mostra "jornada não configurada" em vez
-- de inventar um valor).
-- =============================================================================

alter table funcionarios_internos
  add column if not exists horario_entrada_padrao time,
  add column if not exists horario_saida_padrao time,
  add column if not exists valor_hora numeric(10,2),
  add column if not exists valor_hora_extra numeric(10,2);
