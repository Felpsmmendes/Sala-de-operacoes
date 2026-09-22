-- =============================================================================
-- Migração 024 — Bloqueio de data na Agenda (2026-09-09).
-- Rode isso no SQL Editor do Supabase (depois da 001-023).
--
-- Pedido do usuário: um novo tipo de item na Agenda, diferente de
-- "tarefa" (lembrete livre) — serve pra marcar que uma data (ou
-- intervalo) está reservada por outro motivo (degustação, reunião
-- interna, já reservada por outro evento, etc.), pra avisar (não
-- bloquear) quando alguém tentar gerar um contrato nessa data.
-- =============================================================================

create table bloqueios_agenda (
  id           uuid primary key default gen_random_uuid(),
  categoria    text not null check (categoria in ('degustacao', 'reuniao_interna', 'reserva_evento', 'outro')),
  observacao   text,
  data_inicio  date not null,
  data_fim     date not null check (data_fim >= data_inicio),
  criado_em    timestamptz not null default now()
);
create index idx_bloqueios_agenda_datas on bloqueios_agenda(data_inicio, data_fim);

alter table bloqueios_agenda enable row level security;
create policy gestor_tudo on bloqueios_agenda for all using (eh_gestor()) with check (eh_gestor());
