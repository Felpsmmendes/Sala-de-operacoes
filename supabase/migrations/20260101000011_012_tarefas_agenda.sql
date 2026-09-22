-- =============================================================================
-- Migração 012 — Tarefas da Agenda (lembretes livres, sem contrato)
-- (2026-09-07). Rode isso no SQL Editor do Supabase (depois da 001-011).
--
-- Achado do usuário: a Agenda só mostra `eventos`, e todo `evento` nasce
-- de um contrato (`eventos.contrato_id` é `not null` — 1:1, automático,
-- ver criarContrato em contratos.ts) — não existe (nem deveria existir)
-- um jeito de criar um "evento" solto direto no calendário. O que faltava
-- de verdade era um lembrete rápido preso numa data (ex.: "ligar pro
-- fornecedor X", "confirmar buffet"), sem exigir contrato nenhum — isso
-- é `tarefas_agenda`, uma tabela nova e simples, independente de
-- `eventos`.
-- =============================================================================

create table tarefas_agenda (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  data          date not null,
  horario       time,
  concluida     boolean not null default false,
  observacoes   text,
  criado_em     timestamptz not null default now()
);
create index idx_tarefas_agenda_data on tarefas_agenda(data);

alter table tarefas_agenda enable row level security;
create policy gestor_tudo on tarefas_agenda for all using (eh_gestor()) with check (eh_gestor());
