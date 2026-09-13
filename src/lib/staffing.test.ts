import { describe, expect, it } from 'vitest';
import { calcularStaffNecessario, funcaoContaComo } from './staffing';

describe('calcularStaffNecessario', () => {
  it('sem convidados informados, cai no mínimo (1 bartender + 1 barback)', () => {
    expect(calcularStaffNecessario(null)).toEqual({ bartender: 1, barback: 1 });
  });

  it('até 40 convidados: 1 bartender', () => {
    expect(calcularStaffNecessario(0)).toEqual({ bartender: 1, barback: 1 });
    expect(calcularStaffNecessario(40)).toEqual({ bartender: 1, barback: 1 });
  });

  it('de 41 a 150 convidados: 2 bartenders', () => {
    expect(calcularStaffNecessario(41)).toEqual({ bartender: 2, barback: 1 });
    expect(calcularStaffNecessario(150)).toEqual({ bartender: 2, barback: 1 });
  });

  it('acima de 150 convidados: 3 bartenders (nunca mais que isso)', () => {
    expect(calcularStaffNecessario(151)).toEqual({ bartender: 3, barback: 1 });
    expect(calcularStaffNecessario(1000)).toEqual({ bartender: 3, barback: 1 });
  });

  it('barback é sempre pelo menos 1, nunca zero — regra do vidro de verdade', () => {
    expect(calcularStaffNecessario(1).barback).toBe(1);
    expect(calcularStaffNecessario(500).barback).toBe(1);
  });
});

describe('funcaoContaComo', () => {
  it('head_bartender conta como bartender pra fins de cobertura mínima', () => {
    expect(funcaoContaComo('head_bartender')).toBe('bartender');
  });

  it('bartender conta como bartender', () => {
    expect(funcaoContaComo('bartender')).toBe('bartender');
  });

  it('barback conta como barback', () => {
    expect(funcaoContaComo('barback')).toBe('barback');
  });

  it('outras funções (técnico, motorista) não contam pra cobertura de bar', () => {
    expect(funcaoContaComo('tecnico_imagem')).toBeNull();
    expect(funcaoContaComo('motorista')).toBeNull();
    expect(funcaoContaComo('outro')).toBeNull();
  });
});
