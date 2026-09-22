import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

export type DirecaoOrdenacao = 'asc' | 'desc';
export type EstadoOrdenacao<T extends string> = { campo: T; direcao: DirecaoOrdenacao };

/** Cabeçalho de coluna ordenável (2026-09-16, direção "redesign SaaS" do
    usuário) — genérico por `campo` (união de strings, ex.: os nomes de
    coluna de uma tabela específica), quem chama guarda o estado e decide
    como comparar. Clique alterna asc → desc → remove (volta pro estado
    "sem ordenação" nesta coluna) — nunca fica preso ordenado ao
    contrário do que a pessoa queria. Nenhuma tela usa isso ainda (o
    sistema é majoritariamente cards/mini-cards, não `<table>` crua) —
    fica pronto pra quando uma lista tabular pedir ordenação de verdade. */
export function OrdenacaoColuna<T extends string>({
  campo,
  rotulo,
  ordenacao,
  onMudar,
  className = '',
}: {
  campo: T;
  rotulo: string;
  ordenacao: EstadoOrdenacao<T> | null;
  onMudar: (proximo: EstadoOrdenacao<T> | null) => void;
  className?: string;
}) {
  const ativo = ordenacao?.campo === campo;

  function aoClicar() {
    if (!ativo) return onMudar({ campo, direcao: 'asc' });
    if (ordenacao!.direcao === 'asc') return onMudar({ campo, direcao: 'desc' });
    return onMudar(null);
  }

  const Icone = ativo ? (ordenacao!.direcao === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <button type="button" onClick={aoClicar} className={`flex items-center gap-1 text-left transition-colors hover:text-text ${ativo ? 'text-text' : ''} ${className}`}>
      {rotulo}
      <Icone className={`h-3 w-3 flex-shrink-0 ${ativo ? '' : 'opacity-40'}`} strokeWidth={2.5} />
    </button>
  );
}
