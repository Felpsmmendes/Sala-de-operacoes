import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calcularFaturamentoPorMes, diasAteEvento } from './contratos';
import type { ContratoComLead } from '../types';

// `contratos.ts` importa o client Supabase no topo do arquivo — ver
// `.env.test` (valores fictícios) e `vitest.config.ts` (`mode: 'test'`)
// pra isso não lançar "não configurado" só de importar o módulo. Nenhuma
// função testada aqui chama o Supabase de verdade.

function contratoFake(overrides: Partial<ContratoComLead>): ContratoComLead {
  return {
    id: 'c1',
    orcamento_id: null,
    lead_id: 'l1',
    data_evento: '2026-06-15',
    local: null,
    convidados: 100,
    valor_total: 10000,
    valor_sinal: 2000,
    sinal_pago: false,
    sinal_pago_em: null,
    valor_saldo: 8000,
    saldo_status: 'pendente',
    saldo_pago_em: null,
    chave_pix: null,
    status: 'ativo',
    criado_em: '2026-01-01T00:00:00.000Z',
    atualizado_em: '2026-01-01T00:00:00.000Z',
    forma_pagamento: null,
    observacoes_brindes: null,
    horario_chegada_convidados: null,
    horario_chegada_equipe: null,
    horario_fim_servico: null,
    horario_saida_equipe: null,
    horario_inicio_bar: null,
    tipo_contrato: null,
    documento_texto: null,
    documento_gerado_em: null,
    contrato_assinatura_nome: null,
    contrato_assinatura_cpf: null,
    contrato_assinado_em: null,
    lead: null,
    ...overrides,
  };
}

describe('diasAteEvento', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T15:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('evento no futuro: número positivo de dias', () => {
    expect(diasAteEvento('2026-06-15')).toBe(5);
  });

  it('evento hoje: zero', () => {
    expect(diasAteEvento('2026-06-10')).toBe(0);
  });

  it('evento no passado: negativo (já aconteceu)', () => {
    expect(diasAteEvento('2026-06-01')).toBe(-9);
  });

  it('ignora a hora do dia — só compara a data', () => {
    // "agora" está fixado às 15h; isso não pode contar como "meio dia"
    // e arredondar errado a diferença de dias.
    expect(diasAteEvento('2026-06-11')).toBe(1);
  });
});

describe('calcularFaturamentoPorMes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('soma valor_total por mês do evento, últimos N meses inclusive os vazios', () => {
    const contratos = [contratoFake({ data_evento: '2026-06-05', valor_total: 1000 }), contratoFake({ data_evento: '2026-06-20', valor_total: 500 })];
    const meses = calcularFaturamentoPorMes(contratos, 3);
    expect(meses).toHaveLength(3);
    expect(meses.map((m) => m.mes)).toEqual(['2026-04', '2026-05', '2026-06']);
    expect(meses.find((m) => m.mes === '2026-06')?.valor).toBe(1500);
    expect(meses.find((m) => m.mes === '2026-04')?.valor).toBe(0);
  });

  it('contrato cancelado nunca entra na soma — não é faturamento de verdade', () => {
    const contratos = [contratoFake({ data_evento: '2026-06-05', valor_total: 1000, status: 'cancelado' })];
    const meses = calcularFaturamentoPorMes(contratos, 1);
    expect(meses[0].valor).toBe(0);
  });

  it('sem contrato nenhum, retorna os meses todos com valor zero (nunca quebra o gráfico)', () => {
    const meses = calcularFaturamentoPorMes([], 6);
    expect(meses).toHaveLength(6);
    expect(meses.every((m) => m.valor === 0)).toBe(true);
  });
});
