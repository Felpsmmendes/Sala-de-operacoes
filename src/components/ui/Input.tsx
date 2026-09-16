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
  /** Tooltip no ⓘ ao lado do rótulo (2026-09-15, "melhorias de
      componentes UI") — pra explicação curta que hoje vive espremida
      dentro do próprio texto do rótulo (ex.: "Chave PIX (opcional — pra
      pagamento da diária)"). Diferente de `dica` (texto sempre visível
      abaixo do campo): este só aparece no hover/foco do ⓘ, mantendo o
      rótulo limpo. */
  dicaTooltip?: string;
  /** Mensagem de validação positiva — campo com borda verde + texto
      verde abaixo, mesmo padrão do `erro` só que em sucesso. `erro` tem
      prioridade quando os dois estão presentes (nunca mostra os dois
      juntos). */
  sucesso?: string;
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
export function Input({ rotulo, erro, sucesso, dica, dicaTooltip, categoria = 'neutro', className = '', id, style, ...props }: InputProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {rotulo && (
        <div className="flex items-center gap-1.5">
          <RotuloCampo htmlFor={id}>{rotulo}</RotuloCampo>
          {dicaTooltip && <IconeDica texto={dicaTooltip} />}
        </div>
      )}
      <input
        id={id}
        {...props}
        style={{ '--campo-cor': COR_NUCLEO[categoria], ...style } as CSSProperties}
        className={`campo px-3 py-2.5 text-sm text-text placeholder:text-text-ultra ${erro ? 'campo-erro' : sucesso ? 'campo-sucesso' : ''} ${className}`}
      />
      {erro && <span className="font-mono text-[11px] text-danger">{erro}</span>}
      {sucesso && !erro && <span className="font-mono text-[11px] text-success">{sucesso}</span>}
      {dica && !erro && !sucesso && <span className="text-[11px] text-text-ultra">{dica}</span>}
    </div>
  );
}

/** ⓘ ao lado do rótulo, com tooltip no hover — compartilhado entre
    `Input`/`InputMoeda` (padrão Stripe/GitHub: mantém o rótulo curto,
    a explicação só aparece pra quem precisa dela). CSS puro (sem JS de
    posicionamento) — por isso fica centrado e vira só pra cima; não é
    pensado pra ficar colado na borda da tela. */
function IconeDica({ texto }: { texto: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="flex h-3.5 w-3.5 cursor-help select-none items-center justify-center rounded-full border border-line text-[9px] text-text-ultra">ⓘ</span>
      <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 w-max max-w-[220px] -translate-x-1/2 rounded-[7px] border border-line-strong bg-panel px-2.5 py-1.5 text-[11px] text-text-dim opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {texto}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-line-strong" />
      </span>
    </span>
  );
}

/** Variante monetária (prompt master, seção 4.7) — prefixo "R$" fixo à
    esquerda, valor em mono. O prefixo não pode ficar dentro do próprio
    `<input>`, então o `.campo` (foco/hover/erro) vai na div-wrapper —
    ela reage a `:focus-within` (ver index.css). Categoria default
    "dinheiro" (é sempre valor monetário), mas aceita outra se o campo
    monetário estiver numa tela de outro núcleo. */
export function InputMoeda({ rotulo, erro, sucesso, dicaTooltip, categoria = 'dinheiro', id, className = '', style, ...props }: InputProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {rotulo && (
        <div className="flex items-center gap-1.5">
          <RotuloCampo htmlFor={id}>{rotulo}</RotuloCampo>
          {dicaTooltip && <IconeDica texto={dicaTooltip} />}
        </div>
      )}
      <div style={{ '--campo-cor': COR_NUCLEO[categoria], ...style } as CSSProperties} className={`campo flex items-center overflow-hidden p-0 ${erro ? 'campo-erro' : sucesso ? 'campo-sucesso' : ''} ${className}`}>
        <span className="select-none border-r border-line px-2.5 py-2.5 font-mono text-xs text-text-ultra">R$</span>
        <input id={id} type="number" {...props} className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 font-mono text-sm text-text outline-none" />
      </div>
      {erro && <span className="font-mono text-[11px] text-danger">{erro}</span>}
      {sucesso && !erro && <span className="font-mono text-[11px] text-success">{sucesso}</span>}
    </div>
  );
}
