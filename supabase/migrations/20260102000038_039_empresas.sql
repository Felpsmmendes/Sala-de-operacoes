-- =============================================================================
-- Migração 039 — Fundação multiempresa, Etapa 1 / Entrega 1.1 (2026-09-21).
--
-- Primeira peça da transformação do sistema em SaaS multiempresa (ver
-- documento de auditoria apresentado ao usuário nesta mesma sessão).
-- Só cria a tabela `empresas` — NADA depende dela ainda. Nenhuma tabela
-- existente é alterada, nenhuma política de RLS existente muda, nenhum
-- comportamento hoje em produção é afetado. É seguro rodar isso sozinho
-- e parar aí: o sistema continua funcionando exatamente como antes.
--
-- A Em Cena Eventos vira a primeira linha — não uma linha "genérica" ou
-- de exemplo, é a empresa real rodando hoje (ver instrução do usuário:
-- "a Em Cena deve continuar sendo um tenant funcional da nova
-- arquitetura", Fase 8).
-- =============================================================================

create table empresas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  -- identificador curto, legível e estável (para uso futuro em URL/config,
  -- ex.: onboarding, branding) — único, minúsculo, sem espaço.
  slug        text not null unique check (slug = lower(slug) and slug !~ '\s'),
  criado_em   timestamptz not null default now()
);

insert into empresas (nome, slug) values ('Em Cena Eventos', 'em-cena');

alter table empresas enable row level security;

-- Política mínima por enquanto: só leitura, só por quem já é gestor hoje
-- (reaproveita `eh_gestor()`, migration_030 — continua sendo "gestor de
-- QUALQUER empresa", até a Entrega 2.7 trocar essa função pra considerar
-- também `membros_empresa`). Sem política de insert/update/delete de
-- propósito: criar/editar empresa é a ação mais sensível de todas nessa
-- arquitetura nova, fica manual pelo SQL Editor por enquanto — mesma
-- lógica já usada em `gestores` (migration_030).
create policy leitura_gestor on empresas for select to authenticated using (eh_gestor());
