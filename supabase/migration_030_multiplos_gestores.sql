-- =============================================================================
-- Migração 030 — Suporta MAIS DE UM gestor (Fase E do roadmap: resiliência).
-- Hoje `eh_gestor()` (migration_007) está travado num único UUID escrito
-- direto no código SQL: se essa conta específica for perdida (esquecer a
-- senha sem acesso ao e-mail de recuperação, ser comprometida, o dono
-- ficar impossibilitado etc.), NINGUÉM mais consegue administrar o
-- sistema — nem CRM, nem contratos, nem financeiro, nada. Ponto único de
-- falha real, não hipotético.
--
-- Esta migração troca o UUID fixo por uma tabela `gestores` (allowlist).
-- A conta original é inserida automaticamente abaixo, então NADA muda no
-- comportamento pra quem já usa o sistema — só passa a ser possível
-- adicionar uma 2ª conta.
--
-- Como adicionar um novo gestor (depois de criar a conta em Authentication
-- → Users → Add user, igual já faz pra funcionário interno):
--
--   insert into gestores (id, nome) values ('<uuid-da-conta-nova>', 'Nome da pessoa');
--
-- O UUID da conta aparece na lista de Authentication → Users no painel do
-- Supabase, na coluna "User UID".
-- =============================================================================

create table if not exists gestores (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text,
  criado_em   timestamptz not null default now()
);

-- conta original — preserva o comportamento atual exatamente como era.
insert into gestores (id, nome)
values ('70fcba24-6cfb-43bf-b154-f9d58ac8cc69', 'Conta original')
on conflict (id) do nothing;

-- `security definer` (não tinha antes — não precisava, comparava só um
-- literal) porque agora lê uma tabela de verdade; sem isso, a RLS de
-- `gestores` abaixo entraria em loop (precisaria de eh_gestor() pra ler
-- gestores, que precisa ler gestores...). Rodando como dono da função,
-- ignora a RLS da própria tabela — mesmo padrão já usado em outras RPCs
-- do sistema (ver portal_obter, contar_drinks_evento etc.).
create or replace function eh_gestor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from gestores where id = auth.uid());
$$;

alter table gestores enable row level security;
-- só gestor lê a lista (não é uma tabela que precisa de acesso público
-- nem de funcionário interno) — gerenciar quem é adicionado/removido
-- continua sendo manual pelo SQL Editor de propósito: é a ação mais
-- sensível do sistema (dá acesso total), não expor um botão de UI pra
-- ela reduz o risco de conceder acesso por engano.
create policy gestor_le on gestores for select to authenticated using (eh_gestor());
