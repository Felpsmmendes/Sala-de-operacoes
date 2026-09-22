-- =============================================================================
-- Migração 044 — Painel da plataforma: operação (2026-09-21).
--
-- Fecha as telas do mockup que faltavam no painel (`plataforma-admin/`):
-- Manutenções (chamados), Financeiro (cobranças), Configurações (planos) e o
-- "Acessar sistema" de cada empresa. Tudo restrito a `super_admins` (mesma
-- regra de 041/043) — NUNCA acessível a gestor de empresa nenhuma.
--
-- Sem gateway de pagamento (mesma decisão de 042): cobranças são lançadas e
-- baixadas à mão. "Atrasada" não é um status gravado — é derivado
-- (pendente + vencimento < hoje), pra nunca ficar desatualizado.
-- =============================================================================

-- ---------- "Acessar sistema" ----------
-- Endereço onde o sistema DESSA empresa roda. Hoje todas as empresas usam o
-- mesmo deploy (o isolamento por tenant é a Etapa 2), então normalmente é o
-- mesmo link; quando uma empresa ganhar deploy/domínio próprio, muda aqui.
alter table empresas add column url_sistema text check (url_sistema is null or url_sistema ~ '^https?://');

-- ---------- planos ----------
-- Antes o plano era só um rótulo (check constraint em `empresas.plano`); aqui
-- ganha preço e módulos. `chave` espelha exatamente os 3 valores permitidos
-- em `empresas.plano`. Valores iniciais = os do mockup do usuário — editáveis
-- na tela de Configurações, não são regra de negócio fixa.
create table planos_plataforma (
  chave          text primary key check (chave in ('essencial', 'profissional', 'enterprise')),
  nome           text not null,
  preco_mensal   numeric(10,2) not null default 0 check (preco_mensal >= 0),
  modulos        text[] not null default '{}',
  atualizado_em  timestamptz not null default now()
);

insert into planos_plataforma (chave, nome, preco_mensal, modulos) values
  ('essencial', 'Essencial', 299, array['crm','orcamentos','agenda']),
  ('profissional', 'Profissional', 599, array['crm','orcamentos','agenda','contratos','estoque','escala','ponto','ponto_interno','roteiro']),
  ('enterprise', 'Enterprise', 1199, array['crm','orcamentos','agenda','contratos','estoque','escala','ponto','ponto_interno','roteiro','logistica','financeiro','fechamento','auditoria','portal_cliente']);

-- ---------- manutenções (chamados) ----------
create table chamados_plataforma (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  titulo         text not null,
  descricao      text,
  modulo         text,
  prioridade     text not null default 'media' check (prioridade in ('urgente', 'alta', 'media', 'baixa')),
  status         text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'agendado', 'resolvido')),
  responsavel    text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  resolvido_em   timestamptz,
  check ((status = 'resolvido') = (resolvido_em is not null))
);
create index idx_chamados_plataforma_empresa on chamados_plataforma (empresa_id);
create index idx_chamados_plataforma_status on chamados_plataforma (status);

create table chamados_plataforma_comentarios (
  id          uuid primary key default gen_random_uuid(),
  chamado_id  uuid not null references chamados_plataforma(id) on delete cascade,
  autor       text,
  conteudo    text not null,
  criado_em   timestamptz not null default now()
);
create index idx_chamados_comentarios_chamado on chamados_plataforma_comentarios (chamado_id);

-- ---------- cobranças ----------
create table cobrancas_plataforma (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  descricao   text not null,
  tipo        text not null default 'mensalidade' check (tipo in ('mensalidade', 'implantacao', 'outro')),
  valor       numeric(10,2) not null check (valor >= 0),
  vencimento  date not null,
  status      text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  pago_em     date,
  criado_em   timestamptz not null default now(),
  check ((status = 'pago') = (pago_em is not null))
);
create index idx_cobrancas_plataforma_empresa on cobrancas_plataforma (empresa_id);
create index idx_cobrancas_plataforma_vencimento on cobrancas_plataforma (vencimento);

-- ---------- acesso: só super admin, em tudo ----------
alter table planos_plataforma enable row level security;
alter table chamados_plataforma enable row level security;
alter table chamados_plataforma_comentarios enable row level security;
alter table cobrancas_plataforma enable row level security;

create policy super_admin_tudo on planos_plataforma for all to authenticated using (eh_super_admin()) with check (eh_super_admin());
create policy super_admin_tudo on chamados_plataforma for all to authenticated using (eh_super_admin()) with check (eh_super_admin());
create policy super_admin_tudo on chamados_plataforma_comentarios for all to authenticated using (eh_super_admin()) with check (eh_super_admin());
create policy super_admin_tudo on cobrancas_plataforma for all to authenticated using (eh_super_admin()) with check (eh_super_admin());
