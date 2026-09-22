-- =============================================================================
-- Fundação multiempresa — Etapa 1 (2026-09-22): adiciona `empresa_id` em
-- todas as 38 tabelas de negócio do app de eventos.
--
-- Só ADITIVO, sem mudar nenhum comportamento existente:
--   - Nenhuma policy de RLS muda nesta migração (isso é a Etapa 2,
--     separada — ver plano de separação multiempresa discutido com o
--     usuário). Até lá, `eh_gestor()` continua sendo o único critério
--     de acesso, exatamente como hoje.
--   - `default` é o UUID fixo da Em Cena (não `empresa_atual()`) DE
--     PROPÓSITO: as Edge Functions (alerta-trava-d15,
--     aplicar-automacoes-tempo) escrevem em algumas destas tabelas via
--     service role, sem sessão de usuário — `auth.uid()` (e portanto
--     qualquer função baseada nele) resolveria NULL nesse contexto, o
--     que quebraria o cron de hoje contra a constraint NOT NULL. Como
--     só existe UMA empresa de verdade agora, o valor fixo é
--     equivalente a `empresa_atual()` na prática, sem esse risco. Vira
--     obrigação de cada código de insert passar `empresa_id`
--     explicitamente a partir da Etapa 2 (quando existir uma segunda
--     empresa de verdade) — o default aqui é só uma rede de segurança
--     pro período de transição, não a estratégia final.
--   - Backfill: todo dado hoje é da Em Cena
--     (id fddf7476-8686-490a-873a-181b5ac75a16), então NOT NULL já
--     entra seguro, sem etapa de "preencher depois".
--
-- Tudo dentro de uma transação — ou aplica nas 38 tabelas, ou não
-- aplica em nenhuma.
-- =============================================================================

begin;

alter table auditoria_pos_evento add column empresa_id uuid references empresas(id);
update auditoria_pos_evento set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table auditoria_pos_evento alter column empresa_id set not null;
alter table auditoria_pos_evento alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_auditoria_pos_evento_empresa_id on auditoria_pos_evento (empresa_id);

alter table automacoes_conexoes add column empresa_id uuid references empresas(id);
update automacoes_conexoes set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table automacoes_conexoes alter column empresa_id set not null;
alter table automacoes_conexoes alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_automacoes_conexoes_empresa_id on automacoes_conexoes (empresa_id);

alter table automacoes_execucoes add column empresa_id uuid references empresas(id);
update automacoes_execucoes set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table automacoes_execucoes alter column empresa_id set not null;
alter table automacoes_execucoes alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_automacoes_execucoes_empresa_id on automacoes_execucoes (empresa_id);

alter table automacoes_fluxos add column empresa_id uuid references empresas(id);
update automacoes_fluxos set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table automacoes_fluxos alter column empresa_id set not null;
alter table automacoes_fluxos alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_automacoes_fluxos_empresa_id on automacoes_fluxos (empresa_id);

alter table automacoes_nos add column empresa_id uuid references empresas(id);
update automacoes_nos set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table automacoes_nos alter column empresa_id set not null;
alter table automacoes_nos alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_automacoes_nos_empresa_id on automacoes_nos (empresa_id);

alter table bloqueios_agenda add column empresa_id uuid references empresas(id);
update bloqueios_agenda set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table bloqueios_agenda alter column empresa_id set not null;
alter table bloqueios_agenda alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_bloqueios_agenda_empresa_id on bloqueios_agenda (empresa_id);

alter table checklist_evento add column empresa_id uuid references empresas(id);
update checklist_evento set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table checklist_evento alter column empresa_id set not null;
alter table checklist_evento alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_checklist_evento_empresa_id on checklist_evento (empresa_id);

alter table checklist_evento_itens add column empresa_id uuid references empresas(id);
update checklist_evento_itens set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table checklist_evento_itens alter column empresa_id set not null;
alter table checklist_evento_itens alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_checklist_evento_itens_empresa_id on checklist_evento_itens (empresa_id);

alter table checklist_padrao_itens add column empresa_id uuid references empresas(id);
update checklist_padrao_itens set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table checklist_padrao_itens alter column empresa_id set not null;
alter table checklist_padrao_itens alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_checklist_padrao_itens_empresa_id on checklist_padrao_itens (empresa_id);

alter table checklist_template_itens add column empresa_id uuid references empresas(id);
update checklist_template_itens set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table checklist_template_itens alter column empresa_id set not null;
alter table checklist_template_itens alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_checklist_template_itens_empresa_id on checklist_template_itens (empresa_id);

alter table checklist_templates add column empresa_id uuid references empresas(id);
update checklist_templates set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table checklist_templates alter column empresa_id set not null;
alter table checklist_templates alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_checklist_templates_empresa_id on checklist_templates (empresa_id);

alter table compras add column empresa_id uuid references empresas(id);
update compras set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table compras alter column empresa_id set not null;
alter table compras alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_compras_empresa_id on compras (empresa_id);

alter table contrato_checklist_extra add column empresa_id uuid references empresas(id);
update contrato_checklist_extra set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table contrato_checklist_extra alter column empresa_id set not null;
alter table contrato_checklist_extra alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_contrato_checklist_extra_empresa_id on contrato_checklist_extra (empresa_id);

alter table contratos add column empresa_id uuid references empresas(id);
update contratos set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table contratos alter column empresa_id set not null;
alter table contratos alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_contratos_empresa_id on contratos (empresa_id);

alter table cue_sheet_itens add column empresa_id uuid references empresas(id);
update cue_sheet_itens set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table cue_sheet_itens alter column empresa_id set not null;
alter table cue_sheet_itens alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_cue_sheet_itens_empresa_id on cue_sheet_itens (empresa_id);

alter table disponibilidade_equipe add column empresa_id uuid references empresas(id);
update disponibilidade_equipe set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table disponibilidade_equipe alter column empresa_id set not null;
alter table disponibilidade_equipe alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_disponibilidade_equipe_empresa_id on disponibilidade_equipe (empresa_id);

alter table equipe add column empresa_id uuid references empresas(id);
update equipe set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table equipe alter column empresa_id set not null;
alter table equipe alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_equipe_empresa_id on equipe (empresa_id);

alter table escalas add column empresa_id uuid references empresas(id);
update escalas set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table escalas alter column empresa_id set not null;
alter table escalas alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_escalas_empresa_id on escalas (empresa_id);

alter table estoque_itens add column empresa_id uuid references empresas(id);
update estoque_itens set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table estoque_itens alter column empresa_id set not null;
alter table estoque_itens alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_estoque_itens_empresa_id on estoque_itens (empresa_id);

alter table estoque_movimentos add column empresa_id uuid references empresas(id);
update estoque_movimentos set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table estoque_movimentos alter column empresa_id set not null;
alter table estoque_movimentos alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_estoque_movimentos_empresa_id on estoque_movimentos (empresa_id);

alter table evento_veiculos add column empresa_id uuid references empresas(id);
update evento_veiculos set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table evento_veiculos alter column empresa_id set not null;
alter table evento_veiculos alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_evento_veiculos_empresa_id on evento_veiculos (empresa_id);

alter table eventos add column empresa_id uuid references empresas(id);
update eventos set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table eventos alter column empresa_id set not null;
alter table eventos alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_eventos_empresa_id on eventos (empresa_id);

alter table funcionarios_internos add column empresa_id uuid references empresas(id);
update funcionarios_internos set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table funcionarios_internos alter column empresa_id set not null;
alter table funcionarios_internos alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_funcionarios_internos_empresa_id on funcionarios_internos (empresa_id);

alter table funis_lead add column empresa_id uuid references empresas(id);
update funis_lead set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table funis_lead alter column empresa_id set not null;
alter table funis_lead alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_funis_lead_empresa_id on funis_lead (empresa_id);

alter table integracao_whatsapp add column empresa_id uuid references empresas(id);
update integracao_whatsapp set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table integracao_whatsapp alter column empresa_id set not null;
alter table integracao_whatsapp alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_integracao_whatsapp_empresa_id on integracao_whatsapp (empresa_id);

alter table lancamentos_financeiros add column empresa_id uuid references empresas(id);
update lancamentos_financeiros set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table lancamentos_financeiros alter column empresa_id set not null;
alter table lancamentos_financeiros alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_lancamentos_financeiros_empresa_id on lancamentos_financeiros (empresa_id);

alter table lead_interacoes add column empresa_id uuid references empresas(id);
update lead_interacoes set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table lead_interacoes alter column empresa_id set not null;
alter table lead_interacoes alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_lead_interacoes_empresa_id on lead_interacoes (empresa_id);

alter table leads add column empresa_id uuid references empresas(id);
update leads set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table leads alter column empresa_id set not null;
alter table leads alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_leads_empresa_id on leads (empresa_id);

alter table orcamento_itens add column empresa_id uuid references empresas(id);
update orcamento_itens set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table orcamento_itens alter column empresa_id set not null;
alter table orcamento_itens alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_orcamento_itens_empresa_id on orcamento_itens (empresa_id);

alter table orcamentos add column empresa_id uuid references empresas(id);
update orcamentos set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table orcamentos alter column empresa_id set not null;
alter table orcamentos alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_orcamentos_empresa_id on orcamentos (empresa_id);

alter table ponto_interno_registros add column empresa_id uuid references empresas(id);
update ponto_interno_registros set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table ponto_interno_registros alter column empresa_id set not null;
alter table ponto_interno_registros alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_ponto_interno_registros_empresa_id on ponto_interno_registros (empresa_id);

alter table ponto_registros add column empresa_id uuid references empresas(id);
update ponto_registros set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table ponto_registros alter column empresa_id set not null;
alter table ponto_registros alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_ponto_registros_empresa_id on ponto_registros (empresa_id);

alter table portal_cliente add column empresa_id uuid references empresas(id);
update portal_cliente set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table portal_cliente alter column empresa_id set not null;
alter table portal_cliente alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_portal_cliente_empresa_id on portal_cliente (empresa_id);

alter table regioes_frete add column empresa_id uuid references empresas(id);
update regioes_frete set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table regioes_frete alter column empresa_id set not null;
alter table regioes_frete alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_regioes_frete_empresa_id on regioes_frete (empresa_id);

alter table registros_drink add column empresa_id uuid references empresas(id);
update registros_drink set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table registros_drink alter column empresa_id set not null;
alter table registros_drink alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_registros_drink_empresa_id on registros_drink (empresa_id);

alter table servicos add column empresa_id uuid references empresas(id);
update servicos set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table servicos alter column empresa_id set not null;
alter table servicos alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_servicos_empresa_id on servicos (empresa_id);

alter table tarefas_agenda add column empresa_id uuid references empresas(id);
update tarefas_agenda set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table tarefas_agenda alter column empresa_id set not null;
alter table tarefas_agenda alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_tarefas_agenda_empresa_id on tarefas_agenda (empresa_id);

alter table veiculos add column empresa_id uuid references empresas(id);
update veiculos set empresa_id = 'fddf7476-8686-490a-873a-181b5ac75a16' where empresa_id is null;
alter table veiculos alter column empresa_id set not null;
alter table veiculos alter column empresa_id set default 'fddf7476-8686-490a-873a-181b5ac75a16';
create index idx_veiculos_empresa_id on veiculos (empresa_id);

commit;
