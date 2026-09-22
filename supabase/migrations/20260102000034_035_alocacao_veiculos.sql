-- =============================================================================
-- Migração 035 — Alocação de veículo por evento (2026-09-19).
-- Rode isso no SQL Editor do Supabase (depois da 001-034).
--
-- Pedido do usuário (REVIEW_DECISOES_V2, Parte 6/08 — grid semanal de
-- alocação + conflito de veículo): faltava o vínculo entre um veículo
-- específico e um evento específico. O romaneio antigo que teria isso
-- foi removido (ver migration_016) e nunca voltou — sem essa tabela,
-- "conflito de veículo" só dava pra estimar de forma agregada (mais
-- eventos do que veículos cadastrados no total), nunca apontar QUAL
-- veículo está em conflito.
--
-- Many-to-many de propósito (não um `veiculo_id` direto em `eventos`):
-- um evento grande pode precisar de mais de um veículo (ex.: van + carro
-- de apoio), e a UNIQUE(evento_id, veiculo_id) só impede o MESMO veículo
-- ser alocado duas vezes ao MESMO evento — conflito de agenda (um
-- veículo em dois eventos no mesmo dia) é regra de negócio, checada na
-- aplicação, não no banco.
-- =============================================================================

create table evento_veiculos (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references eventos(id) on delete cascade,
  veiculo_id  uuid not null references veiculos(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  unique (evento_id, veiculo_id)
);
create index idx_evento_veiculos_evento on evento_veiculos(evento_id);
create index idx_evento_veiculos_veiculo on evento_veiculos(veiculo_id);

alter table evento_veiculos enable row level security;
create policy gestor_tudo on evento_veiculos for all using (eh_gestor()) with check (eh_gestor());
