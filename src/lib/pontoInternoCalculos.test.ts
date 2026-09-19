import { describe, expect, it } from 'vitest';
import { calcularGradePresenca, calcularResumoJornada, dataLocal, formatarMinutos } from './pontoInternoCalculos';
import type { FuncionarioInterno, PontoInternoRegistro } from './types';

const func = (extra: Partial<FuncionarioInterno> = {}): FuncionarioInterno => ({
  id: 'f1',
  nome: 'Felipe',
  ativo: true,
  criado_em: '2026-01-01T00:00:00Z',
  horario_entrada_padrao: '08:00',
  horario_saida_padrao: '17:00',
  valor_hora: 10,
  valor_hora_extra: 20,
  ...extra,
});

// horário LOCAL (o cálculo agrupa por dia local, não UTC)
const reg = (id: string, tipo: 'entrada' | 'saida', dia: number, h: number, m: number): PontoInternoRegistro => ({
  id,
  funcionario_id: 'f1',
  tipo,
  horario: new Date(2026, 8, dia, h, m).toISOString(),
});

describe('calcularResumoJornada', () => {
  it('separa normal de extra, soma atraso e calcula o valor a pagar', () => {
    // jornada 08:00–17:00 = 9h; trabalhou 08:15–18:00 = 9h45 → 9h normais + 45min extra, 15min de atraso
    const [r] = calcularResumoJornada([reg('a', 'entrada', 14, 8, 15), reg('b', 'saida', 14, 18, 0)], [func()]);
    expect(r.minutosNormais).toBe(540);
    expect(r.minutosExtras).toBe(45);
    expect(r.atrasoMin).toBe(15);
    expect(r.diasTrabalhados).toBe(1);
    expect(r.jornadaConfigurada).toBe(true);
    expect(r.valorAPagar).toBeCloseTo(9 * 10 + 0.75 * 20);
  });

  it('sem jornada configurada, tudo conta como normal; sem valor/hora, valorAPagar é null', () => {
    const [r] = calcularResumoJornada([reg('a', 'entrada', 14, 9, 0), reg('b', 'saida', 14, 19, 0)], [func({ horario_entrada_padrao: null, horario_saida_padrao: null, valor_hora: null })]);
    expect(r.jornadaConfigurada).toBe(false);
    expect(r.minutosNormais).toBe(600);
    expect(r.minutosExtras).toBe(0);
    expect(r.valorAPagar).toBeNull();
  });

  it('entrada sem saída não soma o dia (jornada em andamento não trava o resto)', () => {
    const [r] = calcularResumoJornada([reg('a', 'entrada', 14, 8, 0), reg('b', 'entrada', 15, 8, 0), reg('c', 'saida', 15, 12, 0)], [func()]);
    expect(r.diasTrabalhados).toBe(1);
    expect(r.minutosNormais).toBe(240);
  });

  it('valor_hora_extra ausente cai no valor_hora normal', () => {
    const [r] = calcularResumoJornada([reg('a', 'entrada', 14, 8, 0), reg('b', 'saida', 14, 18, 0)], [func({ valor_hora_extra: null })]);
    expect(r.valorAPagar).toBeCloseTo(9 * 10 + 1 * 10);
  });
});

describe('calcularGradePresenca', () => {
  it('N normal, A atraso, E extra, F sem registro', () => {
    const dias = [14, 15, 16, 17].map((d) => dataLocal(new Date(2026, 8, d).toISOString()));
    const registros = [
      reg('1', 'entrada', 14, 8, 0), reg('2', 'saida', 14, 17, 0), // normal
      reg('3', 'entrada', 15, 8, 30), reg('4', 'saida', 15, 17, 0), // atraso
      reg('5', 'entrada', 16, 8, 0), reg('6', 'saida', 16, 19, 0), // extra
      // dia 17: nada
    ];
    const estados = calcularGradePresenca(registros, [func()], dias).get('f1')!;
    expect(dias.map((d) => estados.get(d))).toEqual(['N', 'A', 'E', 'F']);
  });
});

describe('formatarMinutos', () => {
  it('zero vira traço; horas e minutos formatados', () => {
    expect(formatarMinutos(0)).toBe('—');
    expect(formatarMinutos(60)).toBe('1h');
    expect(formatarMinutos(135)).toBe('2h 15min');
  });
});
