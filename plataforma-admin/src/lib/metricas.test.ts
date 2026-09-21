import { describe, expect, it } from 'vitest';
import { calcularMrr, dataLocal, diasDeAtraso, funilPlataforma, leadsEmAberto, mrrPorPlano, receitaPorMes, resumoChamados, resumoCobrancas, statusCobranca, taxaInadimplencia, ultimosMeses } from './metricas';

const HOJE = '2026-09-21';

describe('MRR', () => {
  const empresas = [
    { status: 'ativa' as const, mrr: 1199, plano: 'enterprise' as const },
    { status: 'manutencao' as const, mrr: 599, plano: 'profissional' as const },
    { status: 'trial' as const, mrr: 299, plano: 'essencial' as const },
    { status: 'suspensa' as const, mrr: 599, plano: 'profissional' as const },
  ];

  it('soma só quem paga: ativa e em manutenção (trial e suspensa ficam fora)', () => {
    expect(calcularMrr(empresas)).toBe(1798);
  });

  it('agrupa por plano com a mesma regra', () => {
    expect(mrrPorPlano(empresas)).toEqual({ essencial: 0, profissional: 599, enterprise: 1199 });
  });
});

describe('status da cobrança', () => {
  it('vencer hoje ainda é pendente; só passa a atrasada no dia seguinte', () => {
    expect(statusCobranca({ status: 'pendente', vencimento: HOJE }, HOJE)).toBe('pendente');
    expect(statusCobranca({ status: 'pendente', vencimento: '2026-09-20' }, HOJE)).toBe('atrasada');
  });

  it('paga e cancelada nunca viram atrasada', () => {
    expect(statusCobranca({ status: 'pago', vencimento: '2026-01-01' }, HOJE)).toBe('pago');
    expect(statusCobranca({ status: 'cancelado', vencimento: '2026-01-01' }, HOJE)).toBe('cancelado');
  });

  it('conta os dias de atraso', () => {
    expect(diasDeAtraso('2026-09-16', HOJE)).toBe(5);
    expect(diasDeAtraso('2026-09-30', HOJE)).toBe(0);
  });
});

describe('resumo de cobranças', () => {
  const cobrancas = [
    { status: 'pago' as const, valor: 1199, vencimento: '2026-09-10', pago_em: '2026-09-09' },
    { status: 'pago' as const, valor: 599, vencimento: '2026-08-10', pago_em: '2026-08-11' },
    { status: 'pendente' as const, valor: 300, vencimento: '2026-09-25', pago_em: null },
    { status: 'pendente' as const, valor: 800, vencimento: '2026-09-15', pago_em: null },
    { status: 'cancelado' as const, valor: 999, vencimento: '2026-09-01', pago_em: null },
  ];

  it('separa recebido no mês, a receber e em atraso; cancelada não entra em nada', () => {
    expect(resumoCobrancas(cobrancas, HOJE)).toEqual({ recebidoNoMes: 1199, aReceber: 300, emAtraso: 800, qtdEmAtraso: 1 });
  });

  it('receita por mês usa o mês do PAGAMENTO, não do vencimento', () => {
    expect(receitaPorMes(cobrancas, ['2026-07', '2026-08', '2026-09'])).toEqual([0, 599, 1199]);
  });

  it('inadimplência = atraso / (pago + atraso); sem base é null, não 0%', () => {
    expect(taxaInadimplencia(cobrancas, HOJE)).toBeCloseTo((800 / (800 + 1199 + 599)) * 100);
    expect(taxaInadimplencia([], HOJE)).toBeNull();
    expect(taxaInadimplencia([{ status: 'pendente', valor: 100, vencimento: '2026-12-01' }], HOJE)).toBeNull();
  });
});

describe('funil e chamados', () => {
  it('funil conta só etapas em aberto e soma o valor potencial', () => {
    const f = funilPlataforma([
      { etapa: 'lead', valor_potencial: 299 },
      { etapa: 'lead', valor_potencial: null },
      { etapa: 'proposta', valor_potencial: 1199 },
      { etapa: 'ganho', valor_potencial: 999 },
    ]);
    expect(f.find((e) => e.id === 'lead')).toMatchObject({ qtd: 2, valor: 299 });
    expect(f.find((e) => e.id === 'proposta')).toMatchObject({ qtd: 1, valor: 1199 });
    expect(f.some((e) => (e.id as string) === 'ganho')).toBe(false);
    expect(leadsEmAberto([{ etapa: 'lead' }, { etapa: 'ganho' }, { etapa: 'perdido' }, { etapa: 'negociacao' }])).toBe(2);
  });

  it('urgente resolvido não conta como urgente', () => {
    expect(
      resumoChamados([
        { status: 'aberto', prioridade: 'urgente' },
        { status: 'resolvido', prioridade: 'urgente' },
        { status: 'em_andamento', prioridade: 'alta' },
        { status: 'agendado', prioridade: 'baixa' },
      ])
    ).toEqual({ urgentes: 1, emAndamento: 1, agendados: 1, resolvidos: 1, abertos: 3 });
  });
});

describe('datas', () => {
  it('meses: do mais antigo ao atual, virando o ano', () => {
    expect(ultimosMeses(4, new Date(2026, 1, 15))).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('dataLocal usa o dia local (22h em Brasília não vira amanhã)', () => {
    expect(dataLocal(new Date(2026, 8, 21, 23, 30))).toBe('2026-09-21');
  });
});
