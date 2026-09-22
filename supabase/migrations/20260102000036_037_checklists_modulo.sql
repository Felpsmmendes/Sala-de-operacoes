-- =============================================================================
-- Migração 037 — Checklists como módulo (2026-09-19).
-- Rode isso no SQL Editor do Supabase (depois da 001-036).
--
-- SPEC_CAMADA2 2F ("Checklists como módulo") — checklist de PROCESSO
-- (montagem, desmontagem, procedimento próprio), diferente do checklist
-- de CARGA que já existe em Estoque (`checklist_padrao_itens`/
-- `checklist_extra_itens`, ligado a serviço/contrato pra saber O QUE
-- LEVAR). Este é genérico: o gestor monta um template de passos (ex.:
-- "Montagem de bar"), aplica num evento e marca item por item.
--
-- 4 tabelas, mesmo padrão de sempre (template + itens do template,
-- instância + itens da instância — igual orçamento/orcamento_itens):
-- =============================================================================

create table checklist_templates (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  criado_em   timestamptz not null default now()
);

create table checklist_template_itens (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references checklist_templates(id) on delete cascade,
  descricao    text not null,
  quantidade   integer not null default 1,
  ordem        integer not null default 0
);
create index idx_checklist_template_itens_template on checklist_template_itens(template_id);

-- Instância de checklist aplicada a um evento — sem UNIQUE(evento_id): um
-- evento pode ter mais de uma checklist (ex.: "Montagem" + "Desmontagem").
-- `template_id` fica nullable e não é apagado junto com o template (só
-- perde a referência) — a checklist já aplicada no evento não pode sumir
-- se alguém excluir o template depois.
create table checklist_evento (
  id           uuid primary key default gen_random_uuid(),
  evento_id    uuid not null references eventos(id) on delete cascade,
  template_id  uuid references checklist_templates(id) on delete set null,
  nome         text not null,
  criado_em    timestamptz not null default now()
);
create index idx_checklist_evento_evento on checklist_evento(evento_id);

create table checklist_evento_itens (
  id                   uuid primary key default gen_random_uuid(),
  checklist_evento_id  uuid not null references checklist_evento(id) on delete cascade,
  descricao            text not null,
  quantidade           integer not null default 1,
  concluido            boolean not null default false,
  concluido_em         timestamptz,
  ordem                integer not null default 0
);
create index idx_checklist_evento_itens_checklist on checklist_evento_itens(checklist_evento_id);

alter table checklist_templates enable row level security;
alter table checklist_template_itens enable row level security;
alter table checklist_evento enable row level security;
alter table checklist_evento_itens enable row level security;

create policy gestor_tudo on checklist_templates for all using (eh_gestor()) with check (eh_gestor());
create policy gestor_tudo on checklist_template_itens for all using (eh_gestor()) with check (eh_gestor());
create policy gestor_tudo on checklist_evento for all using (eh_gestor()) with check (eh_gestor());
create policy gestor_tudo on checklist_evento_itens for all using (eh_gestor()) with check (eh_gestor());
