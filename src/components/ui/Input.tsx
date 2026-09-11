import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';
import type { CategoriaMetrica } from '../MetricCard';
import { RotuloCampo } from './RotuloCampo';

const COR_NUCLEO: Record<CategoriaMetrica, string> = {
  dinheiro: 'var(--color-money)',
  pessoas: 'var(--color-people)',
  agenda: 'var(--color-schedule)',
  operacao: 'var(--color-ops)',
  acao: 'var(--color-accent)',
  execucao: 'var(--color-execucao)',
  neutro: 'var(--color-neutral)',
};

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo?: ReactNode;
  erro?: string;
  dica?: string;
  /** cor do foco (DESIGN.md > Form Fields, 2026-09-10) — mesma convenção
      que as 35 telas com input cru já usam (`focus:border-money` em
      Contratos, `-people` em CRM etc.); sem isso cai em neutro. */
  categoria?: CategoriaMetrica;
}

/** Input de texto compartilhado (prompt master, seção 4.7) — primeira peça
    de formulário do sistema com componente próprio: até aqui cada tela
    escrevia `<input className="rounded-sm border border-line bg-input
    ...">` na mão (35 arquivos). Migrar as telas existentes pra usar isto
    é trabalho futuro, tela por tela (mesmo padrão do `Button`). */
export function Input({ rotulo, erro, dica, categoria = 'neutro', className = '', id, style, ...props }: InputProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {rotulo && <RotuloCampo htmlFor={id}>{rotulo}</RotuloCampo>}
      <input
        id={id}
        {...props}
        style={{ '--campo-cor': COR_NUCLEO[categoria], ...style } as CSSProperties}
        className={`campo px-3 py-2.5 text-sm text-text placeholder:text-text-ultra ${erro ? 'campo-erro' : ''} ${className}`}
      />
      {erro && <span className="font-mono text-[11px] text-danger">{erro}</span>}
      {dica && !erro && <span className="text-[11px] text-text-ultra">{dica}</span>}
    </div>
  );
}

/** Variante monetária (prompt master, seção 4.7) — prefixo "R$" fixo à
    esquerda, valor em mono. O prefixo não pode ficar dentro do próprio
    `<input>`, então o `.campo` (foco/hover/erro) vai na div-wrapper —
    ela reage a `:focus-within` (ver index.css). Categoria default
    "dinheiro" (é sempre valor monetário), mas aceita outra se o campo
    monetário estiver numa tela de outro núcleo. */
export function InputMoeda({ rotulo, erro, categoria = 'dinheiro', id, className = '', style, ...props }: InputProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {rotulo && <RotuloCampo htmlFor={id}>{rotulo}</RotuloCampo>}
      <div style={{ '--campo-cor': COR_NUCLEO[categoria], ...style } as CSSProperties} className={`campo flex items-center overflow-hidden p-0 ${erro ? 'campo-erro' : ''} ${className}`}>
        <span className="select-none border-r border-line px-2.5 py-2.5 font-mono text-xs text-text-ultra">R$</span>
        <input id={id} type="number" {...props} className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 font-mono text-sm text-text outline-none" />
      </div>
      {erro && <span className="font-mono text-[11px] text-danger">{erro}</span>}
    </div>
  );
}
