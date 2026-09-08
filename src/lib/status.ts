import type { FunilLead, StatusEscala, StatusEvento, TipoInteracao } from './types';
import type { TomBadge } from '../components/Badge';

/** Acha o funil de um lead na lista carregada — os funis agora são
    dinâmicos (tabela `funis_lead`), não um enum fixo. Cai num rótulo
    neutro se a lista de funis ainda não carregou. */
export function funilDoLead(funis: FunilLead[], statusId: string): { rotulo: string; tom: TomBadge } {
  const f = funis.find((x) => x.id === statusId);
  return f ? { rotulo: f.nome, tom: f.cor } : { rotulo: statusId, tom: 'neutro' };
}

/** Classe Tailwind de texto pra cor de um funil — usado nos gráficos de
    "leads por funil" (CRM e Dashboard) pra herdar a mesma cor via
    `fill="currentColor"`. */
export const COR_FUNIL_CLASSE: Record<FunilLead['cor'], string> = { sucesso: 'text-success', pendente: 'text-pending', perigo: 'text-danger', neutro: 'text-neutral' };

export const STATUS_EVENTO_INFO: Record<StatusEvento, { rotulo: string; tom: TomBadge }> = {
  agendado: { rotulo: 'Agendado', tom: 'neutro' },
  em_montagem: { rotulo: 'Em montagem', tom: 'pendente' },
  em_execucao: { rotulo: 'Em execução', tom: 'pendente' },
  encerrado: { rotulo: 'Encerrado', tom: 'sucesso' },
  cancelado: { rotulo: 'Cancelado', tom: 'perigo' },
};

export const STATUS_EVENTO_ORDEM: StatusEvento[] = ['agendado', 'em_montagem', 'em_execucao', 'encerrado', 'cancelado'];

export const STATUS_ESCALA_INFO: Record<StatusEscala, { rotulo: string; tom: TomBadge }> = {
  convocado: { rotulo: 'Convocado', tom: 'pendente' },
  confirmado: { rotulo: 'Confirmado', tom: 'sucesso' },
  recusado: { rotulo: 'Recusado', tom: 'perigo' },
};

export const TIPO_INTERACAO_ROTULO: Record<TipoInteracao, string> = {
  mensagem_whatsapp: 'Mensagem WhatsApp',
  ligacao: 'Ligação',
  email: 'E-mail',
  reuniao: 'Reunião',
  nota: 'Nota',
};

export const FUNCAO_EQUIPE_ROTULO: Record<string, string> = {
  head_bartender: 'Head Bartender',
  bartender: 'Bartender',
  barback: 'Barback',
  tecnico_imagem: 'Técnico de Imagem',
  motorista: 'Motorista',
  outro: 'Apoio',
};

export function formatarMoeda(valor: number | null | undefined): string {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarData(dataIso: string | null | undefined): string {
  if (!dataIso) return '—';
  const [ano, mes, dia] = dataIso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}
