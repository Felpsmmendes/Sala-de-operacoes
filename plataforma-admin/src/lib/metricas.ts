import type { Chamado, Cobranca, Empresa, EtapaPipeline, LeadPlataforma, PlanoEmpresa } from './types';

/* Cálculos do painel (MRR, cobrança em atraso, receita por mês, funil). Funções
   puras, sem acesso a banco, pra ficarem testáveis — é dinheiro. */

/** Data LOCAL 'YYYY-MM-DD'. Nunca `toISOString().slice(0,10)`: é UTC e, depois
    das 21h em Brasília, já vira "amanhã" — cobrança venceria um dia antes. */
export function dataLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Últimos `qtd` meses como 'YYYY-MM', do mais antigo ao atual. */
export function ultimosMeses(qtd: number, base: Date = new Date()): string[] {
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() - (qtd - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

/** Empresa que está gerando receita agora: ativa ou em manutenção (continua
    pagando). Trial não paga ainda; suspensa parou de pagar. */
export function empresaPagante(e: Pick<Empresa, 'status'>): boolean {
  return e.status === 'ativa' || e.status === 'manutencao';
}

export function calcularMrr(empresas: Pick<Empresa, 'status' | 'mrr'>[]): number {
  return empresas.filter(empresaPagante).reduce((s, e) => s + e.mrr, 0);
}

export function mrrPorPlano(empresas: Pick<Empresa, 'status' | 'mrr' | 'plano'>[]): Record<PlanoEmpresa, number> {
  const r: Record<PlanoEmpresa, number> = { essencial: 0, profissional: 0, enterprise: 0 };
  for (const e of empresas.filter(empresaPagante)) r[e.plano] += e.mrr;
  return r;
}

export type StatusCobrancaExibido = 'pago' | 'pendente' | 'atrasada' | 'cancelado';

/** "Atrasada" não é gravada no banco — é pendente com vencimento já passado
    (vencer HOJE ainda não é atraso). */
export function statusCobranca(c: Pick<Cobranca, 'status' | 'vencimento'>, hoje: string): StatusCobrancaExibido {
  if (c.status === 'pago') return 'pago';
  if (c.status === 'cancelado') return 'cancelado';
  return c.vencimento < hoje ? 'atrasada' : 'pendente';
}

export function diasDeAtraso(vencimento: string, hoje: string): number {
  return Math.max(0, Math.round((new Date(`${hoje}T00:00:00`).getTime() - new Date(`${vencimento}T00:00:00`).getTime()) / 86_400_000));
}

/** Receita efetivamente recebida por mês (pelo mês do PAGAMENTO, não do
    vencimento) — `meses` no formato 'YYYY-MM'. */
export function receitaPorMes(cobrancas: Pick<Cobranca, 'status' | 'valor' | 'pago_em'>[], meses: string[]): number[] {
  return meses.map((mes) => cobrancas.filter((c) => c.status === 'pago' && c.pago_em?.slice(0, 7) === mes).reduce((s, c) => s + c.valor, 0));
}

export type ResumoCobrancas = { recebidoNoMes: number; aReceber: number; emAtraso: number; qtdEmAtraso: number };

export function resumoCobrancas(cobrancas: Pick<Cobranca, 'status' | 'valor' | 'vencimento' | 'pago_em'>[], hoje: string): ResumoCobrancas {
  const mes = hoje.slice(0, 7);
  const r: ResumoCobrancas = { recebidoNoMes: 0, aReceber: 0, emAtraso: 0, qtdEmAtraso: 0 };
  for (const c of cobrancas) {
    const st = statusCobranca(c, hoje);
    if (st === 'pago' && c.pago_em?.slice(0, 7) === mes) r.recebidoNoMes += c.valor;
    else if (st === 'pendente') r.aReceber += c.valor;
    else if (st === 'atrasada') {
      r.emAtraso += c.valor;
      r.qtdEmAtraso++;
    }
  }
  return r;
}

/** Inadimplência = atraso / (tudo que era pra ter sido pago até hoje ou já foi:
    pago + atrasado). Null sem base — "0%" seria dado inventado. */
export function taxaInadimplencia(cobrancas: Pick<Cobranca, 'status' | 'valor' | 'vencimento'>[], hoje: string): number | null {
  let atraso = 0;
  let base = 0;
  for (const c of cobrancas) {
    const st = statusCobranca(c, hoje);
    if (st === 'atrasada') {
      atraso += c.valor;
      base += c.valor;
    } else if (st === 'pago') base += c.valor;
  }
  return base > 0 ? (atraso / base) * 100 : null;
}

/** Ordem de exibição do pipeline: etapas comuns pela `ordem`, e as duas especiais
    (ganho, perdido) sempre no fim — mesmo que a ordem gravada diga outra coisa. */
export function ordenarEtapas<T extends Pick<EtapaPipeline, 'ordem' | 'papel'>>(etapas: T[]): T[] {
  const peso = (e: T) => (e.papel === 'ganho' ? 1_000_001 : e.papel === 'perdido' ? 1_000_002 : e.ordem);
  return [...etapas].sort((a, b) => peso(a) - peso(b));
}

/** Funil de vendas: só as etapas em aberto (papel nulo) — ganho/perdido saem do funil. */
export function funilPlataforma(
  leads: Pick<LeadPlataforma, 'etapa' | 'valor_potencial'>[],
  etapas: Pick<EtapaPipeline, 'id' | 'nome' | 'ordem' | 'papel'>[]
): { id: string; rotulo: string; qtd: number; valor: number }[] {
  return ordenarEtapas(etapas)
    .filter((e) => e.papel === null)
    .map((e) => {
      const doEstagio = leads.filter((l) => l.etapa === e.id);
      return { id: e.id, rotulo: e.nome, qtd: doEstagio.length, valor: doEstagio.reduce((s, l) => s + (l.valor_potencial ?? 0), 0) };
    });
}

/** Lead "em aberto" = está numa etapa comum. Etapa desconhecida não conta (nunca chuta). */
export function leadsEmAberto(leads: Pick<LeadPlataforma, 'etapa'>[], etapas: Pick<EtapaPipeline, 'id' | 'papel'>[]): number {
  const abertas = new Set(etapas.filter((e) => e.papel === null).map((e) => e.id));
  return leads.filter((l) => abertas.has(l.etapa)).length;
}

export type ResumoChamados = { urgentes: number; emAndamento: number; agendados: number; resolvidos: number; abertos: number };

export function resumoChamados(chamados: Pick<Chamado, 'status' | 'prioridade'>[]): ResumoChamados {
  const naoResolvidos = chamados.filter((c) => c.status !== 'resolvido');
  return {
    urgentes: naoResolvidos.filter((c) => c.prioridade === 'urgente').length,
    emAndamento: chamados.filter((c) => c.status === 'em_andamento').length,
    agendados: chamados.filter((c) => c.status === 'agendado').length,
    resolvidos: chamados.filter((c) => c.status === 'resolvido').length,
    abertos: naoResolvidos.length,
  };
}
