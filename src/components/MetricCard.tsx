import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useContagem } from '../lib/useContagem';
import { Sparkline } from './charts/Sparkline';

/** 5 categorias fixas por significado (DESIGN.md, "The Meaning-Color
    Rule", 2026-09-09) + "neutro" pra métrica que não se encaixa em
    nenhuma — nunca uma 6ª cor nova. */
export type CategoriaMetrica = 'dinheiro' | 'pessoas' | 'agenda' | 'operacao' | 'acao' | 'neutro';

const CATEGORIA_COR: Record<CategoriaMetrica, string> = {
  dinheiro: 'var(--color-money)',
  pessoas: 'var(--color-people)',
  agenda: 'var(--color-schedule)',
  operacao: 'var(--color-ops)',
  acao: 'var(--color-accent)',
  neutro: 'var(--color-neutral)',
};

/** Tom do rótulo/ícone — diferente do tom de fundo em "acao" (usa o par
    accent/accent-label, já tunado por tema); nas outras 4 categorias o
    token -label já resolve sozinho pro tom certo por tema (ver index.css). */
const CATEGORIA_LABEL: Record<CategoriaMetrica, string> = {
  dinheiro: 'var(--color-money-label)',
  pessoas: 'var(--color-people-label)',
  agenda: 'var(--color-schedule-label)',
  operacao: 'var(--color-ops-label)',
  acao: 'var(--color-accent-label)',
  neutro: 'var(--color-neutral)',
};

/** Cartão de métrica — mesmo padrão visual do painel anterior
    (`.metrica-card` em ../../Texto/assets/css/base.css): rótulo+ícone,
    valor grande em mono, legenda. Reaproveitado em todas as telas com
    resumo numérico no topo.

    `categoria` (opcional, 2026-09-09 — ver DESIGN.md "The Meaning-Color
    Rule" e "The Glass-For-Emphasis Rule"): decide a cor do vidro/
    gradiente do card — dinheiro=verde, pessoas=azul, agenda=roxo,
    operacao=teal, acao=âmbar. Sem categoria explícita cai em "neutro"
    (cinza) — ainda ganha o efeito de vidro, só sem forçar numa das 5
    cores. Escolher a categoria certa PRA CADA métrica de cada tela é
    trabalho de uma etapa futura (tela por tela, a pedido do usuário);
    deixar opcional aqui evita que essa única mudança de componente
    force editar toda tela do sistema de uma vez só.

    `tendencia` (opcional, 2026-09-08): selo de variação — só passe
    quando houver uma comparação REAL de período (ex.: faturamento deste
    mês vs. mês anterior); nunca inventar uma tendência só pra preencher
    o card.

    Motion (DESIGN.md > Motion, 2026-09-09) — 3 recursos opcionais, todos
    desligados por padrão (zero risco pros ~55 usos existentes):
    `historico` desenha um Sparkline na cor da categoria ao lado do valor;
    `aoVivo` acende a bolinha pulsante (só métrica em tempo real/"hoje",
    nunca histórica); `valorAnimado` troca o `valor` estático por uma
    contagem de 0 até `alvo` — reservado ao valor "herói" da tela, nunca
    toda métrica pequena. `comoLink` embrulha o card num `Link` com o
    hover elevado do sistema (só faz sentido se o card for mesmo
    clicável). */
export function MetricCard({
  Icone,
  rotulo,
  valor,
  legenda,
  tendencia,
  categoria = 'neutro',
  historico,
  aoVivo = false,
  valorAnimado,
  comoLink,
}: {
  Icone: LucideIcon;
  rotulo: string;
  valor: string;
  legenda: string;
  tendencia?: { percentual: number; positivo: boolean };
  categoria?: CategoriaMetrica;
  historico?: number[];
  aoVivo?: boolean;
  valorAnimado?: { alvo: number; formatar: (v: number) => string };
  comoLink?: string;
}) {
  const cor = CATEGORIA_COR[categoria];
  const corLabel = CATEGORIA_LABEL[categoria];
  const contado = useContagem(valorAnimado?.alvo ?? 0, 1000);
  const valorExibido = valorAnimado ? valorAnimado.formatar(contado) : valor;

  // vidro + gradiente (The Glass-For-Emphasis Rule) — opacidades vêm dos
  // tokens --glass-* (index.css), que trocam de valor por tema (The
  // Theme-Intensity Rule: claro precisa de bem mais opacidade pro mesmo
  // efeito percebido). Fundo é a MESMA base da página (--color-bg),
  // nunca um painel sólido por baixo.
  const estiloGlass: CSSProperties = {
    background: `linear-gradient(135deg, color-mix(in srgb, ${cor} var(--glass-grad-1), transparent), color-mix(in srgb, ${cor} var(--glass-grad-2), transparent)), var(--color-bg)`,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `1px solid color-mix(in srgb, ${cor} var(--glass-border-op), transparent)`,
    boxShadow: `0 8px 32px color-mix(in srgb, ${cor} var(--glass-shadow-op), transparent), inset 0 1px 0 0 var(--glass-inset)`,
  };

  const conteudo = (
    <div className="flex flex-col gap-3 rounded-lg p-4" style={estiloGlass}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: corLabel }}>
          {rotulo}
          {aoVivo && <span className="pulso-vivo" style={{ '--pulso-cor': cor } as CSSProperties} title="Ao vivo" />}
        </span>
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
          style={{ border: `1px solid color-mix(in srgb, ${cor} 20%, transparent)`, background: `color-mix(in srgb, ${cor} 14%, transparent)` }}
        >
          <Icone className="h-3.5 w-3.5" strokeWidth={2} style={{ color: corLabel }} />
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          {/* valor grande sempre na cor de texto principal, nunca na cor da
              categoria — precisa de contraste máximo pra leitura rápida
              (DESIGN.md, seção Cards/MetricCard). */}
          <strong className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-text">{valorExibido}</strong>
          {tendencia && (
            <span
              className={`flex flex-shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10.5px] font-semibold ${
                tendencia.positivo ? 'border-success/25 bg-success/15 text-success' : 'border-danger/25 bg-danger/15 text-danger'
              }`}
            >
              {tendencia.positivo ? <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} /> : <ArrowDown className="h-2.5 w-2.5" strokeWidth={3} />}
              {Math.abs(tendencia.percentual).toFixed(1)}%
            </span>
          )}
        </div>
        {historico && historico.length > 1 && <Sparkline pontos={historico} cor={cor} />}
      </div>
      <span className="text-[11.5px] text-text-dim">{legenda}</span>
    </div>
  );

  if (comoLink) {
    return (
      <Link to={comoLink} className="hover-elevado block rounded-lg">
        {conteudo}
      </Link>
    );
  }
  return conteudo;
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <section className="metric-grid mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</section>;
}
