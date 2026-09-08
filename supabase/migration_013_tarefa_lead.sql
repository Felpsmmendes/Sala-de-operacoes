-- =============================================================================
-- Migração 013 — tarefa da Agenda pode ligar a um lead (2026-09-07).
-- Rode isso no SQL Editor do Supabase (depois da 001-012, precisa da
-- migration_012_tarefas_agenda.sql já aplicada).
--
-- Pedido do usuário: uma tarefa tipo "Degustação com Fulano" precisa
-- aparecer também no histórico de conversa do lead, não só solta no
-- calendário — sem isso, não tinha como saber (sem abrir o CRM e
-- lembrar de cabeça) se um lead em "Degustação agendada" já tem data
-- marcada. `lead_id` é opcional — continua dando pra criar tarefa livre
-- (ex.: "chefe tem compromisso"), sem lead nenhum.
-- =============================================================================

alter table tarefas_agenda add column if not exists lead_id uuid references leads(id) on delete set null;
create index if not exists idx_tarefas_agenda_lead on tarefas_agenda(lead_id);
