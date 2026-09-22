import type { FuncaoEquipe } from './types';

export type RequisitoStaff = { bartender: number; barback: number };

/**
 * Regra real da empresa (confirmada com o usuário, 2026-09-06): todo
 * pacote de bar sai com vidro de verdade (nunca descartável), por isso
 * SEMPRE precisa de pelo menos 1 barback, não importa o tamanho do
 * evento. Bartender escala pelo número de convidados: até 40 → 1, até
 * 150 → 2, acima de 150 → 3 (mais um barman extra, confirmado pelo
 * usuário — não há mais nenhum degrau além desse, então eventos bem
 * maiores que 150 ainda pedem só 3 bartenders nessa regra).
 */
export function calcularStaffNecessario(convidados: number | null): RequisitoStaff {
  const n = convidados ?? 0;
  let bartender = 1;
  if (n > 40) bartender = 2;
  if (n > 150) bartender = 3;
  return { bartender, barback: 1 };
}

/** head_bartender conta como bartender pra fins de cobertura mínima —
    é um bartender com responsabilidade extra, não uma função à parte
    pro requisito de quantidade. */
export function funcaoContaComo(funcao: FuncaoEquipe): 'bartender' | 'barback' | null {
  if (funcao === 'bartender' || funcao === 'head_bartender') return 'bartender';
  if (funcao === 'barback') return 'barback';
  return null;
}
