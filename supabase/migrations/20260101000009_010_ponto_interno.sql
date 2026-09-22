-- =============================================================================
-- Migração 010 — Ponto Eletrônico de verdade, só pros funcionários internos
-- (2026-09-07). Rode isso no SQL Editor do Supabase (depois das migrações
-- 001-009).
--
-- Pedido do usuário: o "Ponto Eletrônico" antigo (migration_003) é, na
-- prática, um check-in de CHEGADA NO EVENTO pros freelancers contratados
-- (sem login, escolhe o nome numa lista) — continua existindo (renomeado
-- pra "Check-in de Equipe" na tela), mas não serve pro controle de ponto
-- real da empresa. Este aqui é NOVO e separado: pros funcionários FIXOS
-- (hoje só o dono da conta + o chefe dele, crescendo aos poucos), com
-- login de verdade (conta própria no Supabase Auth — decisão do usuário:
-- não é visibilidade operacional como o de freelancer, é ponto de
-- verdade), batido num dispositivo fixo (tablet/computador compartilhado),
-- só entrada/saída (sem intervalo por enquanto).
--
-- Como funciona a identidade: `funcionarios_internos.id` = o próprio
-- `auth.users.id` da conta (1:1). Não existe auto-cadastro de conta (self-
-- signup já está desligado no projeto desde a auditoria de segurança) —
-- o gestor cria a conta manualmente no painel do Supabase (Authentication
-- → Users → Add user/convite) e passa as credenciais pro funcionário. No
-- primeiro login em `/ponto-interno`, o próprio funcionário digita o nome
-- uma vez (linha própria criada por ele mesmo, `auth.uid() = id` — não dá
-- pra criar linha em nome de outra pessoa). Dali em diante é só entrar e
-- bater ponto.
--
-- `eh_gestor()` continua travado num usuário específico (migration_007) —
-- criar essas contas novas NÃO dá acesso a nada além do que essas duas
-- tabelas liberam abaixo: `gestor_tudo` (todas as outras tabelas do
-- sistema) não reconhece essas contas como gestor, então CRM/financeiro/
-- contratos etc. continuam fechados pra elas.
-- =============================================================================

create table funcionarios_internos (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table ponto_interno_registros (
  id               uuid primary key default gen_random_uuid(),
  funcionario_id   uuid not null references funcionarios_internos(id) on delete cascade,
  tipo             text not null check (tipo in ('entrada', 'saida')),
  horario          timestamptz not null default now()
);
create index idx_ponto_interno_funcionario on ponto_interno_registros(funcionario_id, horario desc);

alter table funcionarios_internos enable row level security;
-- gestor vê/gerencia todo mundo (ativar/desativar funcionário que saiu da empresa).
create policy gestor_tudo on funcionarios_internos for all using (eh_gestor()) with check (eh_gestor());
-- cada conta enxerga só a própria linha — precisa pra saber "quem sou eu"
-- ao entrar no kiosk.
create policy proprio_le on funcionarios_internos for select using (auth.uid() = id);
-- auto-cadastro do nome no primeiro login — só da própria linha, nunca em
-- nome de outra conta.
create policy proprio_se_cadastra on funcionarios_internos for insert with check (auth.uid() = id);

alter table ponto_interno_registros enable row level security;
create policy gestor_tudo on ponto_interno_registros for all using (eh_gestor()) with check (eh_gestor());
-- cada conta só lê e bate o PRÓPRIO ponto — nunca o de outro funcionário.
create policy proprio_le_registros on ponto_interno_registros for select using (auth.uid() = funcionario_id);
create policy proprio_bate_ponto on ponto_interno_registros for insert with check (auth.uid() = funcionario_id);
