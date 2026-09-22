-- =============================================================================
-- Migração 026 — Contador de drinks em tempo real (Fase C do roadmap,
-- 2026-09-11). Rode isso no SQL Editor do Supabase.
--
-- Decisão de produto (mesma lógica do Ponto Eletrônico público, ver
-- migration_003): não precisa de POS caro nem de catálogo de receita —
-- é só um log de toques (1 linha por drink servido), sem login, num link
-- público por evento (`/drinks/:eventoId`). O head bartender toca "+1"
-- a cada drink; o gestor vê o total e o ritmo (drinks/hora) em tempo
-- real no Dashboard, sem precisar perguntar.
--
-- Log append-only de propósito (nunca um contador único que alguém
-- decrementa) — dá pra calcular ritmo por hora depois, a partir dos
-- horários, e nunca perde histórico se cancelar um toque errado.
-- =============================================================================

create table registros_drink (
  id        uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete restrict,
  criado_em timestamptz not null default now()
);

create index idx_registros_drink_evento on registros_drink(evento_id);

alter table registros_drink enable row level security;

-- anon só INSERE, nunca lê a tabela bruta — e só pra evento que existe e
-- não está cancelado (mesmo padrão do Ponto Eletrônico público).
create policy anon_registra_drink on registros_drink for insert to anon
  with check (
    exists (select 1 from eventos where eventos.id = registros_drink.evento_id and eventos.status <> 'cancelado')
  );

-- só o gestor lê os registros individuais (com horário) — é o que
-- alimenta o ritmo/total real do Dashboard.
create policy gestor_le_drinks on registros_drink for select to authenticated
  using (eh_gestor());

-- RPC security definer — devolve só a CONTAGEM (nunca os registros
-- individuais) pra tela pública mostrar o total sem expor a tabela
-- bruta pro anon (mesma lógica de segurança do Portal do Cliente, ver
-- README > Segurança).
create or replace function contar_drinks_evento(p_evento_id uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from registros_drink where evento_id = p_evento_id;
$$;

grant execute on function contar_drinks_evento(uuid) to anon, authenticated;
