export type PlanoEmpresa = 'essencial' | 'profissional' | 'enterprise';
export type StatusEmpresa = 'ativa' | 'trial' | 'suspensa' | 'manutencao';

export type ModuloPlataforma =
  | 'crm'
  | 'orcamentos'
  | 'contratos'
  | 'agenda'
  | 'escala'
  | 'estoque'
  | 'logistica'
  | 'roteiro'
  | 'ponto'
  | 'ponto_interno'
  | 'financeiro'
  | 'fechamento'
  | 'auditoria'
  | 'portal_cliente';

export type Empresa = {
  id: string;
  nome: string;
  slug: string;
  plano: PlanoEmpresa;
  status: StatusEmpresa;
  mrr: number;
  proxima_cobranca: string | null;
  ultimo_pagamento_em: string | null;
  saude: number;
  modulos_ativos: ModuloPlataforma[];
  observacoes: string | null;
  criado_em: string;
};

export type EtapaLeadPlataforma = 'lead' | 'contato' | 'demonstracao' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';

export type LeadPlataforma = {
  id: string;
  nome_empresa: string;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  origem: string | null;
  etapa: EtapaLeadPlataforma;
  plano_interesse: PlanoEmpresa | null;
  valor_potencial: number | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type TipoInteracaoLeadPlataforma = 'mensagem_whatsapp' | 'ligacao' | 'email' | 'reuniao' | 'nota';

export type InteracaoLeadPlataforma = {
  id: string;
  lead_id: string;
  tipo: TipoInteracaoLeadPlataforma;
  conteudo: string;
  criado_em: string;
};
