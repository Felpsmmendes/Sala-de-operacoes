import type { TomBadge } from '../components/ui/Badge';
import type { ModuloPlataforma, PlanoEmpresa, PrioridadeChamado, StatusChamado, StatusCobranca, StatusEmpresa } from './types';
import type { StatusCobrancaExibido } from './metricas';

export const PLANO_ROTULO: Record<PlanoEmpresa, string> = { essencial: 'Essencial', profissional: 'Profissional', enterprise: 'Enterprise' };

export const STATUS_EMPRESA_INFO: Record<StatusEmpresa, { rotulo: string; tom: TomBadge }> = {
  ativa: { rotulo: 'Ativa', tom: 'sucesso' },
  trial: { rotulo: 'Trial', tom: 'pendente' },
  manutencao: { rotulo: 'Manutenção', tom: 'pendente' },
  suspensa: { rotulo: 'Suspensa', tom: 'perigo' },
};

/** Alinhados com as rotas reais do Sala de Operações (Layout.tsx > NUCLEOS). */
export const MODULOS: { id: ModuloPlataforma; rotulo: string }[] = [
  { id: 'crm', rotulo: 'CRM & Pipeline' },
  { id: 'orcamentos', rotulo: 'Orçamentos' },
  { id: 'contratos', rotulo: 'Contratos' },
  { id: 'agenda', rotulo: 'Agenda' },
  { id: 'escala', rotulo: 'Equipe & Escalas' },
  { id: 'estoque', rotulo: 'Estoque' },
  { id: 'logistica', rotulo: 'Logística' },
  { id: 'roteiro', rotulo: 'Sala de Operações' },
  { id: 'ponto', rotulo: 'Ponto de Chegada' },
  { id: 'ponto_interno', rotulo: 'Ponto Interno' },
  { id: 'financeiro', rotulo: 'Financeiro' },
  { id: 'fechamento', rotulo: 'Fechamento Mensal' },
  { id: 'auditoria', rotulo: 'Pós-Evento' },
  { id: 'portal_cliente', rotulo: 'Portal do Cliente' },
];

export function rotuloModulo(id: string | null): string {
  return MODULOS.find((m) => m.id === id)?.rotulo ?? (id ? id : '—');
}

export const PRIORIDADE_INFO: Record<PrioridadeChamado, { rotulo: string; tom: TomBadge }> = {
  urgente: { rotulo: 'Urgente', tom: 'perigo' },
  alta: { rotulo: 'Alta', tom: 'pendente' },
  media: { rotulo: 'Média', tom: 'neutro' },
  baixa: { rotulo: 'Baixa', tom: 'neutro' },
};

export const STATUS_CHAMADO_INFO: Record<StatusChamado, { rotulo: string; tom: TomBadge }> = {
  aberto: { rotulo: 'Aberto', tom: 'pendente' },
  em_andamento: { rotulo: 'Em andamento', tom: 'pendente' },
  agendado: { rotulo: 'Agendado', tom: 'neutro' },
  resolvido: { rotulo: 'Resolvido', tom: 'sucesso' },
};

export const STATUS_COBRANCA_INFO: Record<StatusCobrancaExibido, { rotulo: string; tom: TomBadge }> = {
  pago: { rotulo: 'Pago', tom: 'sucesso' },
  pendente: { rotulo: 'Pendente', tom: 'pendente' },
  atrasada: { rotulo: 'Atrasada', tom: 'perigo' },
  cancelado: { rotulo: 'Cancelada', tom: 'neutro' },
};

export type { StatusCobranca };
