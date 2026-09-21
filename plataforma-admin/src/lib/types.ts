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
  /** Onde o sistema DESSA empresa roda — alvo do botão "Acessar sistema". */
  url_sistema: string | null;
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

/* -------------------- Operação (migration_044) -------------------- */

export type PrioridadeChamado = 'urgente' | 'alta' | 'media' | 'baixa';
export type StatusChamado = 'aberto' | 'em_andamento' | 'agendado' | 'resolvido';

export type Chamado = {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string | null;
  modulo: string | null;
  prioridade: PrioridadeChamado;
  status: StatusChamado;
  responsavel: string | null;
  criado_em: string;
  atualizado_em: string;
  resolvido_em: string | null;
};

export type ChamadoComEmpresa = Chamado & { empresa: { id: string; nome: string } | null };

export type ComentarioChamado = { id: string; chamado_id: string; autor: string | null; conteudo: string; criado_em: string };

export type TipoCobranca = 'mensalidade' | 'implantacao' | 'outro';
export type StatusCobranca = 'pendente' | 'pago' | 'cancelado';

export type Cobranca = {
  id: string;
  empresa_id: string;
  descricao: string;
  tipo: TipoCobranca;
  valor: number;
  vencimento: string;
  status: StatusCobranca;
  pago_em: string | null;
  criado_em: string;
};

export type CobrancaComEmpresa = Cobranca & { empresa: { id: string; nome: string } | null };

export type PlanoPlataforma = { chave: PlanoEmpresa; nome: string; preco_mensal: number; modulos: ModuloPlataforma[]; atualizado_em: string };
