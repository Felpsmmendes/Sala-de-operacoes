import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useContagem } from '../lib/useContagem';
import { Sparkline } from './charts/Sparkline';
import { IconBox } from './ui/IconBox';

/** 6 categorias fixas por significado (DESIGN.md > "Mapa de Núcleo →
    Cor", 2026-09-10) + "neutro" pra métrica que não se encaixa em
    nenhuma — nunca uma 7ª cor nova. "execucao" é a categoria nova desta
    rodada (Eventos ativos/em andamento), separada de "dinheiro". */
export type CategoriaMetrica = 'dinheiro' | 'pessoas' | 'agenda' | 'operacao' | 'acao' | 'execucao' | 'neutro';

const CATEGORIA_COR: Record<CategoriaMetrica, string> = {
  dinheiro: 'var(--color-money)',
  pessoas: 'var(--color-people)',
  agenda: 'var(--color-schedule)',
  operacao: 'var(--color-ops)',
  acao: 'var(--color-accent)',
  execucao: 'var(--color-execucao)',
  neutro: 'var(--color-neutral)',
};

/** Tom do ícone dentro do IconBox — no escuro a própria cor de núcleo já
    é clara o bastante; no claro os tokens `-label` (index.css) trocam
    pra um tom mais escuro/saturado, senão o ícone soma contraste ruim
    contra fundo branco. */
const CATEGORIA_LABEL: Record<CategoriaMetrica, string> = {
  dinheiro: 'var(--color-money-label)',
  pessoas: 'var(--color-people-label)',
  agenda: 'var(--color-schedule-label)',
  operacao: 'var(--color-ops-label)',
  acao: 'var(--color-accent-label)',
  execucao: 'var(--color-execucao-label)',
  neutro: 'var(--color-neutral)',
};

/** Cartão de métrica — visual v2 (2026-09-10, "prompt master" do
    usuário): card SÓLIDO (`.panel-glass`, sem vidro/blur — ver
    index.css), borda e fundo sempre NEUTROS; a cor da categoria fica
    restrita ao `IconBox` (e ao Sparkline/DotLive quando presentes) —
    "Regra do Núcleo": cor de núcleo nunca em borda/fundo de card, número
    KPI ou rótulo (ver DESIGN.md). Isso é uma mudança deliberada em
    relação à v1 (que tingia todo o card na cor da categoria).

    `categoria` (opcional): decide só a cor do IconBox/Sparkline — sem
    categoria explícita cai em "neutro" (cinza).

    `tendencia` (opcional): selo de variação — só passe quando houver uma
    comparação REAL de período; nunca inventar uma tendência só pra
    preencher o card.

    `historico`/`aoVivo`/`valorAnimado`/`comoLink`: mesmos recursos
    opcionais de sempre (Sparkline, DotLive, contagem animada, card
    clicável), desligados por padrão. */
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
  const corIcone = CATEGORIA_LABEL[categoria];
  const contado = useContagem(valorAnimado?.alvo ?? 0, 1000);
  const valorExibido = valorAnimado ? valorAnimado.formatar(contado) : valor;

  const conteudo = (
    <div className="panel-glass flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        {/* 1 linha só: rótulo comprido trunca com "…" (texto inteiro no title) em vez de
            quebrar em 2–3 linhas e desalinhar os cards da mesma fileira. `truncate` no
            texto interno (não `line-clamp` no flex) porque line-clamp não funciona em
            elemento flex. */}
        <span className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-text-faint" title={rotulo}>
          <span className="truncate">{rotulo}</span>
          {aoVivo && <span className="pulso-vivo flex-shrink-0" style={{ '--pulso-cor': cor } as CSSProperties} title="Ao vivo" />}
        </span>
        <IconBox Icone={Icone} cor={cor} corIcone={corIcone} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          {/* valor grande sempre branco, nunca na cor da categoria — é o
              número KPI, banido da lista de "onde a cor de núcleo aparece".
              2 camadas de defesa contra dado longo (achado do usuário,
              2026-09-14, com endereço/valor real preenchendo o sistema):
              1) `clamp()` encolhe a fonte pra valor comprido (nunca esconde
              dígito de um número); 2) `truncate` + `title` é o último
              recurso pra texto livre (ex.: endereço em MetricCard de
              "Local") que nem encolhendo cabe numa linha — nunca estoura o
              card, mostra o valor inteiro no hover/toque longo. */}
          <strong
            className="min-w-0 truncate font-mono font-bold leading-none tracking-tight tabular-nums text-text"
            style={{ fontSize: valorExibido.length > 10 ? 'clamp(16px, 3vw, 22px)' : valorExibido.length > 7 ? 'clamp(18px, 3.5vw, 24px)' : '26px' }}
            title={valorExibido.length > 7 ? valorExibido : undefined}
          >
            {valorExibido}
          </strong>
          {tendencia && (
            <span
              className={`hidden flex-shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10.5px] font-semibold sm:flex ${
                tendencia.positivo ? 'border-success/25 bg-success/15 text-success' : 'border-danger/25 bg-danger/15 text-danger'
              }`}
            >
              {tendencia.positivo ? <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} /> : <ArrowDown className="h-2.5 w-2.5" strokeWidth={3} />}
              {Math.abs(tendencia.percentual).toFixed(1)}%
            </span>
          )}
        </div>
        {historico && historico.length > 1 && (
          <span className="hidden flex-shrink-0 sm:flex">
            <Sparkline pontos={historico} cor={cor} />
          </span>
        )}
      </div>
      <span className="text-[11.5px] text-text-faint">{legenda}</span>
    </div>
  );

  if (comoLink) {
    return (
      <Link to={comoLink} className="hover-elevado block rounded-[18px]">
        {conteudo}
      </Link>
    );
  }
  return conteudo;
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <section className="metric-grid mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">{children}</section>;
}
