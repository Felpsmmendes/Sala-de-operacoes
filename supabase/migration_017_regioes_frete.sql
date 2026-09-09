-- =============================================================================
-- Migração 017 — Regiões de frete (2026-09-09).
-- Rode isso no SQL Editor do Supabase (depois da 001-016).
--
-- Pedido do usuário: cadastro livre de região (ex.: "Zona Sul" - 15km,
-- "Litoral" - 80km) pra alimentar a calculadora de frete nova, no lugar
-- de digitar o km na mão toda vez. `km_aproximado` é a distância de IDA
-- (a calculadora dobra pra ida+volta) — ver comentário em
-- src/lib/api/regioesFrete.ts se essa convenção mudar.
-- =============================================================================

create table regioes_frete (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  km_aproximado numeric(8,1) not null check (km_aproximado >= 0),
  criado_em     timestamptz not null default now()
);

alter table regioes_frete enable row level security;
create policy gestor_tudo on regioes_frete for all using (eh_gestor()) with check (eh_gestor());
