-- =============================================================================
-- Migração 023 — Roteiro base automático a partir dos horários do
-- contrato (2026-09-09, "Etapa 8").
-- Rode isso no SQL Editor do Supabase (depois da 001-022).
--
-- Pedido do usuário: ao abrir um evento no Roteiro do Evento, o sistema
-- gera sozinho os cues de chegada/início/fim a partir dos horários já
-- preenchidos no contrato (migration_021). `origem` marca quem criou o
-- cue — só pra saber a origem (mostrado como uma tag "auto" na tela) e
-- pra sincronizar sem duplicar (procura por título entre os cues
-- 'automatico' do evento antes de criar um novo). Nunca apaga um cue
-- automático sozinho, mesmo que o horário no contrato mude ou seja
-- limpo depois — só atualiza o horário se o cue já existir; excluir
-- continua sendo uma ação manual do gestor, igual pros cues manuais.
-- =============================================================================

alter table cue_sheet_itens
  add column if not exists origem text not null default 'manual' check (origem in ('manual', 'automatico'));
