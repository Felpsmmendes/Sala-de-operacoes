import { ChevronLeft, ChevronRight, Download, Wallet } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { Badge } from '../Badge';
import { Panel, PanelHeader } from '../Panel';
import { SkeletonLinhas } from '../Skeleton';
import { EstadoVazio } from '../ui/EmptyState';
import { OrdenacaoColuna, type EstadoOrdenacao } from '../OrdenacaoColuna';
import { exportarCsv } from '../../lib/exportarCsv';
import { formatarData, formatarMoeda, normalizarTexto } from '../../lib/status';
import type { Lancamento, TipoLancamento } from '../../lib/types';

function formatarMes(mes: string): string {
  const [ano, m] = mes.slice(0, 7).split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

/** Painel "Lançamentos" reaproveitado por Contas a Receber e Contas a
    Pagar (2026-09-19, SPEC_CAMADA2 2E) — extraído linha por linha do
    Financeiro.tsx original, só trocando o filtro rápido Receitas/Despesas
    (agora desnecessário: a própria página já escopa por `tipo`) por
    Todos/Vencidos/Próx. 7 dias. Mesma lógica de mês, ordenação, CSV,
    marcar pago e excluir. */
export function ListaLancamentos({
  tipo,
  lancamentos,
  idsVencidos,
  em7diasStr,
  mesAtual,
  carregando,
  aoMarcarPago,
  aoExcluir,
}: {
  tipo: TipoLancamento;
  lancamentos: Lancamento[];
  idsVencidos: Set<string>;
  em7diasStr: string;
  mesAtual: string;
  carregando: boolean;
  aoMarcarPago: (id: string, pago: boolean) => void;
  aoExcluir: (id: string) => void;
}) {
  const [filtro, setFiltro] = useState<'todos' | 'vencidos' | 'proximos7'>('todos');
  const [mesLancamentos, setMesLancamentos] = useState<string | 'todos'>('todos');
  const [ordenacao, setOrdenacao] = useState<EstadoOrdenacao<'vencimento' | 'valor' | 'descricao'> | null>(null);

  const doTipo = lancamentos.filter((l) => l.tipo === tipo);

  const visiveis = doTipo.filter((l) => {
    const hojeStr = new Date().toISOString().slice(0, 10);
    const passaFiltro = filtro === 'todos' ? true : filtro === 'vencidos' ? idsVencidos.has(l.id) : l.status === 'pendente' && !!l.vencimento && l.vencimento >= hojeStr && l.vencimento <= em7diasStr;
    if (!passaFiltro) return false;
    if (mesLancamentos === 'todos') return true;
    const dataRef = l.status === 'pago' ? l.data_pagamento : l.vencimento;
    return (dataRef ?? '').slice(0, 7) === mesLancamentos;
  });

  const visiveisOrdenados = !ordenacao
    ? visiveis
    : [...visiveis].sort((a, b) => {
        const cmp =
          ordenacao.campo === 'valor'
            ? a.valor - b.valor
            : ordenacao.campo === 'vencimento'
              ? (a.vencimento ?? '').localeCompare(b.vencimento ?? '')
              : normalizarTexto(a.descricao).localeCompare(normalizarTexto(b.descricao));
        return ordenacao.direcao === 'asc' ? cmp : -cmp;
      });

  function mesLancamentosDeslocado(deslocamento: number): string {
    const base = mesLancamentos === 'todos' ? mesAtual : mesLancamentos;
    const d = new Date(`${base}-01T00:00:00`);
    d.setMonth(d.getMonth() + deslocamento);
    return d.toISOString().slice(0, 7);
  }

  return (
    <Panel>
      <PanelHeader
        titulo="Lançamentos"
        desc={carregando ? undefined : `${visiveis.length} de ${doTipo.length}`}
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-sm border border-line">
              <button type="button" disabled={mesLancamentos === 'todos'} onClick={() => setMesLancamentos(mesLancamentosDeslocado(-1))} className="px-2 py-1.5 text-text-dim hover:bg-raised hover:text-text disabled:opacity-30" title="Mês anterior">
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setMesLancamentos((atual) => (atual === 'todos' ? mesAtual : 'todos'))}
                className="min-w-[92px] px-2 py-1.5 text-center font-mono text-[12px] font-semibold text-text hover:bg-raised"
              >
                {mesLancamentos === 'todos' ? 'Todos os meses' : formatarMes(mesLancamentos)}
              </button>
              <button
                type="button"
                disabled={mesLancamentos === 'todos' || mesLancamentos >= mesAtual}
                onClick={() => setMesLancamentos(mesLancamentosDeslocado(1))}
                className="px-2 py-1.5 text-text-dim hover:bg-raised hover:text-text disabled:opacity-30"
                title="Próximo mês"
              >
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
            <div className="inline-flex flex-wrap gap-0.5 rounded-sm border border-line bg-input p-0.5">
              {(
                [
                  { f: 'todos' as const, rotulo: 'Todos' },
                  { f: 'vencidos' as const, rotulo: 'Vencidos' },
                  { f: 'proximos7' as const, rotulo: 'Próx. 7 dias' },
                ] as const
              ).map(({ f, rotulo }) => (
                <button key={f} type="button" onClick={() => setFiltro(f)} className={`rounded-[5px] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${filtro === f ? 'bg-raised text-money' : 'text-text-dim hover:text-text'}`}>
                  {rotulo}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={visiveis.length === 0}
              onClick={() =>
                exportarCsv(
                  [
                    ['Descrição', 'Valor', 'Vencimento', 'Status', 'Pago em', 'Observações'],
                    ...visiveis.map((l) => [l.descricao, formatarMoeda(l.valor), l.vencimento ? formatarData(l.vencimento) : '—', l.status === 'pago' ? 'Pago' : 'Pendente', l.data_pagamento ? formatarData(l.data_pagamento) : '—', l.observacoes ?? '—']),
                  ],
                  `${tipo}-${mesLancamentos}-${filtro}`
                )
              }
              className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] text-text-dim hover:bg-raised hover:text-text disabled:opacity-40"
            >
              <Download className="h-3 w-3" strokeWidth={2} />
              Exportar CSV
            </button>
          </div>
        }
      />

      {carregando ? (
        <SkeletonLinhas />
      ) : visiveis.length === 0 ? (
        <EstadoVazio Icone={Wallet} titulo="Nenhum lançamento aqui" />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 px-3 pb-1 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
            <OrdenacaoColuna campo="descricao" rotulo="Descrição" ordenacao={ordenacao} onMudar={setOrdenacao} />
            <OrdenacaoColuna campo="valor" rotulo="Valor" ordenacao={ordenacao} onMudar={setOrdenacao} />
            <OrdenacaoColuna campo="vencimento" rotulo="Vencimento" ordenacao={ordenacao} onMudar={setOrdenacao} />
          </div>
          {visiveisOrdenados.map((l) => {
            const hojeStr = new Date().toISOString().slice(0, 10);
            const vencido = l.status === 'pendente' && !!l.vencimento && l.vencimento < hojeStr;
            const diasAtraso = vencido && l.vencimento ? Math.round((new Date(hojeStr + 'T00:00:00').getTime() - new Date(l.vencimento + 'T00:00:00').getTime()) / 86400000) : 0;
            const bordaTipo = l.status !== 'pago' && !vencido ? (l.tipo === 'receita' ? 'border-l-2 border-l-success' : 'border-l-2 border-l-danger/40') : '';
            return (
              <div
                key={l.id}
                className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm ${l.status === 'pago' || vencido ? 'list-row-tint' : 'list-row'} ${bordaTipo}`}
                style={l.status === 'pago' ? ({ '--row-color': 'var(--color-money)' } as CSSProperties) : vencido ? ({ '--row-color': 'var(--color-danger)' } as CSSProperties) : undefined}
              >
                <div className="min-w-0">
                  <strong className={l.tipo === 'receita' ? 'text-success' : 'text-text'}>
                    {l.tipo === 'receita' ? '+' : '−'} {formatarMoeda(l.valor)}
                  </strong>
                  <span className="ml-2 text-text">{l.descricao}</span>
                  {l.categoria && <span className="ml-2 rounded-full border border-line bg-input px-2 py-0.5 text-[10px] text-text-faint">{l.categoria}</span>}
                  <p className={`text-[11.5px] ${vencido ? 'font-semibold text-danger' : 'text-text-faint'}`}>
                    {l.vencimento ? `vence ${formatarData(l.vencimento)}` : 'sem vencimento'}
                    {l.data_pagamento ? ` · pago em ${formatarData(l.data_pagamento)}` : ''}
                    {vencido ? ` · vencido há ${diasAtraso} dia${diasAtraso === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tom={l.status === 'pago' ? 'sucesso' : vencido ? 'perigo' : 'pendente'} texto={l.status === 'pago' ? 'Pago' : vencido ? 'Atrasado' : 'Pendente'} />
                  <button type="button" onClick={() => aoMarcarPago(l.id, l.status !== 'pago')} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                    {l.status === 'pago' ? 'Marcar pendente' : 'Marcar pago'}
                  </button>
                  <button type="button" onClick={() => aoExcluir(l.id)} className="text-[11.5px] font-medium text-danger hover:underline">
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 pt-3 text-sm">
            <span className="font-mono text-[11px] uppercase tracking-wide text-text-faint">
              Total ({visiveis.length} lançamento{visiveis.length === 1 ? '' : 's'})
            </span>
            <span className={`font-mono font-semibold ${tipo === 'receita' ? 'text-success' : 'text-danger'}`}>
              {tipo === 'receita' ? '+' : '−'} {formatarMoeda(visiveis.reduce((s, l) => s + l.valor, 0))}
            </span>
          </div>
        </div>
      )}
    </Panel>
  );
}
