-- =============================================================================
-- Migração 042 — Painel "Empresas" completo (2026-09-21).
--
-- Segue o mockup que o usuário trouxe pra essa tela: MRR, próxima
-- cobrança, saúde e módulos ativados por empresa, além de permitir
-- cadastrar uma empresa nova pela própria tela (antes só manual pelo
-- SQL Editor — agora que existe uma tela real, restrita a
-- `super_admins`, dar um formulário faz sentido).
--
-- Cobrança continua SEM gateway de pagamento real (fora do escopo
-- combinado nas fases originais — "não implementar cobrança real,
-- só preparar a arquitetura"): `mrr`/`proxima_cobranca`/
-- `ultimo_pagamento_em` são campos editados manualmente pelo super
-- admin, não vêm de nenhuma integração.
-- =============================================================================

alter table empresas add column mrr numeric(10,2) not null default 0 check (mrr >= 0);
alter table empresas add column proxima_cobranca date;
alter table empresas add column ultimo_pagamento_em date;

-- "Saúde" também é manual por enquanto — não existe hoje nenhum sinal
-- automático (uso, erros, satisfação) que dê pra calcular isso sozinho;
-- fica como um número que o super admin ajusta, não inventa dado.
alter table empresas add column saude int not null default 100 check (saude between 0 and 100);

-- Módulos ativados (fundação da Fase 6 "Sistema de módulos" do plano
-- original) — guarda a CONFIGURAÇÃO aqui; ainda não tem nada no
-- frontend lendo isso pra esconder/mostrar módulo de verdade (isso é
-- uma entrega própria, futura). Lista alinhada com as rotas reais que
-- já existem em `src/components/Layout.tsx` (NUCLEOS).
alter table empresas add column modulos_ativos text[] not null default array[
  'crm','orcamentos','contratos','agenda','escala','estoque','logistica',
  'roteiro','ponto','ponto_interno','financeiro','fechamento','auditoria','portal_cliente'
];

alter table empresas add column observacoes text;

-- Status ganha 'manutencao' (mockup mostra uma empresa nesse estado) —
-- troca a constraint pelo conjunto novo.
alter table empresas drop constraint if exists empresas_status_check;
alter table empresas add constraint empresas_status_check check (status in ('ativa', 'trial', 'suspensa', 'manutencao'));

-- Cadastrar empresa pela tela (antes só SQL Editor, ver migration_039) —
-- agora que a tela é restrita e testada, faz sentido liberar. Continua
-- exclusivo do super admin; vincular o 1º usuário dessa empresa em
-- `membros_empresa` continua manual por enquanto (isso é Fase 7,
-- onboarding — fora do escopo desta entrega).
create policy criacao_super_admin on empresas for insert to authenticated with check (eh_super_admin());
