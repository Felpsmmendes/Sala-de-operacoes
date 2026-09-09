import type { ReactNode } from 'react';

/** Cartão de seção — equivalente ao `.painel` do painel anterior.
    `panel-glass` (DESIGN.md > Panel, "The Glass-Everywhere Rule",
    2026-09-09) substitui o fundo sólido `bg-panel` + `shadow-card` por
    vidro leve (gradiente quase neutro + blur + borda/sombra próprias) —
    afeta automaticamente toda tela que usa `Panel`. */
export function Panel({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`min-w-0 panel-glass rounded-lg p-5 ${className}`}>
      {children}
    </section>
  );
}

export function PanelHeader({ titulo, desc, acao }: { titulo: string; desc?: string; acao?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-text">{titulo}</h2>
        {desc && <p className="mt-0.5 text-[13px] text-text-dim">{desc}</p>}
      </div>
      {acao}
    </div>
  );
}

/** Controle segmentado (ex.: Pipeline/Tabela) — mesmo padrão `.seg` do painel anterior.
    `corAtiva` (2026-09-09, auditoria do usuário): classe Tailwind de texto pra opção
    ativa — o âmbar fixo de antes não tinha relação com nenhuma categoria; cada tela
    agora passa a cor da sua própria categoria (ex. "text-people"), com neutro como
    default pra quem não passar nada. */
export function Segmented<T extends string>({
  valor,
  opcoes,
  onMudar,
  corAtiva = 'text-neutral',
}: {
  valor: T;
  opcoes: { valor: T; rotulo: string }[];
  onMudar: (v: T) => void;
  corAtiva?: string;
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-sm border border-line bg-input p-0.5">
      {opcoes.map((op) => (
        <button
          key={op.valor}
          type="button"
          onClick={() => onMudar(op.valor)}
          className={`rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
            op.valor === valor ? `bg-raised ${corAtiva}` : 'text-text-dim hover:text-text'
          }`}
        >
          {op.rotulo}
        </button>
      ))}
    </div>
  );
}
