import { describe, expect, it } from 'vitest';
import { corFunilPorIndice, formatarData, formatarMoeda, funilDoLead } from './status';
import type { FunilLead } from './types';

describe('formatarMoeda', () => {
  it('formata em Real brasileiro, com casas decimais e separador de milhar', () => {
    expect(formatarMoeda(1234.5)).toBe('R$ 1.234,50');
  });

  it('null/undefined vira R$ 0,00, nunca "R$ NaN" ou quebra a tela', () => {
    expect(formatarMoeda(null)).toBe('R$ 0,00');
    expect(formatarMoeda(undefined)).toBe('R$ 0,00');
  });

  it('zero de verdade também formata normal', () => {
    expect(formatarMoeda(0)).toBe('R$ 0,00');
  });
});

describe('formatarData', () => {
  it('converte ISO (YYYY-MM-DD) pro formato brasileiro (DD/MM/YYYY)', () => {
    expect(formatarData('2026-09-10')).toBe('10/09/2026');
  });

  it('aceita um datetime completo, usa só a parte da data', () => {
    expect(formatarData('2026-01-05T14:30:00.000Z')).toBe('05/01/2026');
  });

  it('null/undefined vira travessão, nunca "undefined" na tela', () => {
    expect(formatarData(null)).toBe('—');
    expect(formatarData(undefined)).toBe('—');
  });
});

describe('corFunilPorIndice', () => {
  it('alterna entre as 2 cores da paleta por posição, nunca uma 3ª cor', () => {
    expect(corFunilPorIndice(0)).toBe('text-people');
    expect(corFunilPorIndice(1)).toBe('text-schedule');
    expect(corFunilPorIndice(2)).toBe('text-people');
    expect(corFunilPorIndice(3)).toBe('text-schedule');
  });
});

describe('funilDoLead', () => {
  const funis: FunilLead[] = [{ id: 'f1', nome: 'Novo', cor: 'neutro', ordem: 0, papel: 'novo', criado_em: '2026-01-01T00:00:00.000Z' }];

  it('acha o funil pelo id do status do lead', () => {
    expect(funilDoLead(funis, 'f1')).toEqual({ rotulo: 'Novo', tom: 'neutro' });
  });

  it('funil desconhecido (lista ainda não carregou, ou id órfão) cai em neutro sem quebrar', () => {
    expect(funilDoLead(funis, 'nao-existe')).toEqual({ rotulo: 'nao-existe', tom: 'neutro' });
    expect(funilDoLead([], 'f1')).toEqual({ rotulo: 'f1', tom: 'neutro' });
  });
});
