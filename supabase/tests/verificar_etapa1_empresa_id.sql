-- Verificação da Etapa 1 (fundação multiempresa) — rode depois de aplicar
-- a migração 20260922045000_fundacao_multiempresa_empresa_id.sql:
--
--   npx supabase db query --linked --file supabase/tests/verificar_etapa1_empresa_id.sql
--
-- Só leitura, não muda nada. Cada linha do resultado tem que mostrar
-- `tem_coluna = true`, `not_null = true` e `linhas_sem_empresa = 0` —
-- qualquer outro valor significa que a Etapa 1 não terminou direito
-- naquela tabela.

select
  c.table_name,
  bool_or(c.column_name = 'empresa_id') as tem_coluna,
  bool_or(c.column_name = 'empresa_id' and c.is_nullable = 'NO') as not_null
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in (
    'auditoria_pos_evento','automacoes_conexoes','automacoes_execucoes','automacoes_fluxos',
    'automacoes_nos','bloqueios_agenda','checklist_evento','checklist_evento_itens',
    'checklist_padrao_itens','checklist_template_itens','checklist_templates','compras',
    'contrato_checklist_extra','contratos','cue_sheet_itens','disponibilidade_equipe','equipe',
    'escalas','estoque_itens','estoque_movimentos','evento_veiculos','eventos',
    'funcionarios_internos','funis_lead','integracao_whatsapp','lancamentos_financeiros',
    'lead_interacoes','leads','orcamento_itens','orcamentos','ponto_interno_registros',
    'ponto_registros','portal_cliente','regioes_frete','registros_drink','servicos',
    'tarefas_agenda','veiculos'
  )
group by c.table_name
order by c.table_name;
