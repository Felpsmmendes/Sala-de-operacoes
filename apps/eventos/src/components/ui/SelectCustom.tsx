import { useEffect, useRef, useState, type CSSProperties } from 'react';
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

export interface OpcaoSelect {
  valor: string;
  rotulo: string;
  /** emoji ou string curta — opcional, nem toda lista precisa de ícone. */
  icone?: string;
  descricao?: string;
}

export interface GrupoSelect {
  grupo: string;
  opcoes: OpcaoSelect[];
}

interface SelectCustomProps {
  rotulo?: string;
  placeholder?: string;
  value: string;
  onChange: (valor: string) => void;
  /** Array de `OpcaoSelect` pra lista simples, ou de `GrupoSelect` pra
      lista com cabeçalho de grupo. */
  opcoes: OpcaoSelect[] | GrupoSelect[];
  erro?: string;
  dica?: string;
  categoria?: CategoriaMetrica;
  desabilitado?: boolean;
}

function isGrupos(o: OpcaoSelect[] | GrupoSelect[]): o is GrupoSelect[] {
  return o.length > 0 && 'grupo' in o[0];
}

/** Dropdown totalmente customizado — suporta ícone por opção e grupos
    com cabeçalho, pra quando o `<Select>` nativo (que continua existindo
    e em uso na maioria das telas) não dá pra encaixar isso. Padrão
    Linear/Jira. Fecha ao clicar fora ou selecionar; navegação por
    teclado fica pro nativo (é o trade-off de reimplementar o próprio
    dropdown — usar só onde ícone/grupo realmente compensa, não em toda
    tela). 2026-09-15, "melhorias de componentes UI" do usuário. */
export function SelectCustom({ rotulo, placeholder = 'Selecione…', value, onChange, opcoes, erro, dica, categoria = 'neutro', desabilitado = false }: SelectCustomProps) {
  const [aberto, setAberto] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cor = COR_NUCLEO[categoria];

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  const todasOpcoes: OpcaoSelect[] = isGrupos(opcoes) ? opcoes.flatMap((g) => g.opcoes) : opcoes;
  const selecionada = todasOpcoes.find((o) => o.valor === value);

  function pick(valor: string) {
    onChange(valor);
    setAberto(false);
  }

  function Opcao(op: OpcaoSelect) {
    const sel = op.valor === value;
    return (
      <button
        key={op.valor}
        type="button"
        onClick={() => pick(op.valor)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-raised"
        style={{ background: sel ? `color-mix(in srgb, ${cor} 6%, var(--color-raised))` : 'transparent', color: sel ? cor : 'var(--color-text-dim)' }}
      >
        {op.icone && <span className="flex-shrink-0 text-[15px]">{op.icone}</span>}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{op.rotulo}</span>
          {op.descricao && <span className="mt-0.5 block text-[11px] text-text-ultra">{op.descricao}</span>}
        </span>
        {sel && <span className="flex-shrink-0 text-[11px]" style={{ color: cor }}>✓</span>}
      </button>
    );
  }

  return (
    <div ref={wrapRef} className="relative flex w-full flex-col gap-1.5">
      {rotulo && <RotuloCampo>{rotulo}</RotuloCampo>}

      <button
        type="button"
        disabled={desabilitado}
        onClick={() => setAberto((a) => !a)}
        style={
          {
            '--campo-cor': cor,
            borderColor: aberto ? `color-mix(in srgb, ${cor} 45%, transparent)` : undefined,
            boxShadow: aberto ? `0 0 0 3px color-mix(in srgb, ${cor} 8%, transparent)` : undefined,
          } as CSSProperties
        }
        className={`campo flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-sm ${desabilitado ? 'cursor-not-allowed opacity-40' : ''} ${erro ? 'campo-erro' : ''}`}
      >
        <span className={selecionada ? 'text-text' : 'text-text-ultra'}>
          {selecionada ? (
            <span className="flex items-center gap-2">
              {selecionada.icone && <span>{selecionada.icone}</span>}
              {selecionada.rotulo}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <span className="ml-2 flex-shrink-0 text-[11px] text-text-ultra" style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▾
        </span>
      </button>

      {aberto && (
        <div className="absolute left-0 right-0 z-50 overflow-hidden rounded-[10px] border border-line-strong bg-panel shadow-lg" style={{ top: 'calc(100% + 4px)' }}>
          {isGrupos(opcoes)
            ? opcoes.map((g) => (
                <div key={g.grupo}>
                  <p className="px-3 pb-1 pt-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-text-ultra">{g.grupo}</p>
                  {g.opcoes.map(Opcao)}
                </div>
              ))
            : <div className="py-1">{(opcoes as OpcaoSelect[]).map(Opcao)}</div>}
        </div>
      )}

      {erro && <span className="font-mono text-[11px] text-danger">{erro}</span>}
      {dica && !erro && <span className="text-[11px] text-text-ultra">{dica}</span>}
    </div>
  );
}
