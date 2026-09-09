import { AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatarMoeda } from '../../lib/status';
import type { ContratoComLead } from '../../lib/types';
import { Panel, PanelHeader } from '../Panel';

function formatarMes(mes: string): string {
  const [ano, m] = mes.split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

type FaixaValor = 'baixo' | 'medio' | 'alto';
const FAIXA_ROTULO: Record<FaixaValor, string> = { baixo: 'Baixo (até R$3.000)', medio: 'Médio (R$3.000–R$7.000)', alto: 'Alto (acima de R$7.000)' };
const FAIXA_ORDEM: FaixaValor[] = ['baixo', 'medio', 'alto'];

/** Pedido do usuário (2026-09-09): até R$3.000 = baixo, R$3.000–R$7.000 =
    médio, acima de R$7.000 = alto. */
function faixaDoValor(v: number): FaixaValor {
  if (v <= 3000) return 'baixo';
  if (v <= 7000) return 'medio';
  return 'alto';
}

/** Análise de vendas — separada de qualquer tela de Fechamento (pedido
    explícito do usuário): contratos FECHADOS (não cancelados — inclui
    ativo e concluído, mesmo recorte que "Total contratado" já usa no
    topo da própria tela de Contratos) agrupados por mês do evento, por
    local e por faixa de valor. `local` é um campo que já existia no
    schema mas nunca era preenchido de verdade — esta seção avisa quando
    tem contrato sem local informado, pra incentivar o preenchimento
    (não bloqueia nada retroativamente, mas o formulário de criar/editar
    contrato agora exige o campo daqui pra frente). */
export function AnaliseVendas({ contratos }: { contratos: ContratoComLead[] }) {
  const fechados = useMemo(() => contratos.filter((c) => c.status !== 'cancelado'), [contratos]);
  const meses = useMemo(() => [...new Set(fechados.map((c) => c.data_evento.slice(0, 7)))].sort().reverse(), [fechados]);
  const [mesEscolhido, setMesEscolhido] = useState('');
  const mesAtivo = mesEscolhido || meses[0] || '';
  const doMes = useMemo(() => fechados.filter((c) => c.data_evento.slice(0, 7) === mesAtivo), [fechados, mesAtivo]);

  const porLocal = useMemo(() => {
    const mapa = new Map<string, { qtd: number; valor: number }>();
    for (const c of doMes) {
      const chave = c.local?.trim() || 'Sem local informado';
      const atual = mapa.get(chave) ?? { qtd: 0, valor: 0 };
      mapa.set(chave, { qtd: atual.qtd + 1, valor: atual.valor + c.valor_total });
    }
    return [...mapa.entries()].sort((a, b) => b[1].valor - a[1].valor);
  }, [doMes]);

  const porFaixa = useMemo(() => {
    const mapa = new Map<FaixaValor, { qtd: number; valor: number }>(FAIXA_ORDEM.map((f) => [f, { qtd: 0, valor: 0 }]));
    for (const c of doMes) {
      const f = faixaDoValor(c.valor_total);
      const atual = mapa.get(f)!;
      mapa.set(f, { qtd: atual.qtd + 1, valor: atual.valor + c.valor_total });
    }
    return FAIXA_ORDEM.map((f) => [f, mapa.get(f)!] as const);
  }, [doMes]);

  const semLocal = doMes.filter((c) => !c.local?.trim()).length;
  const totalMes = doMes.reduce((s, c) => s + c.valor_total, 0);

  return (
    <Panel>
      <PanelHeader
        titulo="Análise de vendas"
        desc="Contratos fechados, agrupados por mês do evento, local e faixa de valor."
        acao={
          meses.length > 0 && (
            <select value={mesAtivo} onChange={(e) => setMesEscolhido(e.target.value)} className="rounded-sm border border-line bg-input px-3 py-2 text-[12.5px] text-text outline-none focus:border-money">
              {meses.map((m) => (
                <option key={m} value={m}>
                  {formatarMes(m)}
                </option>
              ))}
            </select>
          )
        }
      />

      {meses.length === 0 ? (
        <p className="text-sm text-text-dim">Nenhum contrato fechado ainda.</p>
      ) : (
        <>
          <p className="mb-3 text-[12.5px] text-text-dim">
            {doMes.length} contrato(s) em {formatarMes(mesAtivo)} · <span className="font-mono text-text">{formatarMoeda(totalMes)}</span>
          </p>

          {semLocal > 0 && (
            <p className="mb-4 flex items-center gap-1.5 rounded-sm border border-pending/30 bg-pending/10 px-3 py-2 text-[12.5px] text-pending">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} /> {semLocal} contrato(s) neste mês sem local informado — preencha em "Editar" pra essa análise ficar completa.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Por local</p>
              <div className="flex flex-col gap-1.5">
                {porLocal.map(([local, dado]) => (
                  <div key={local} className="flex items-center justify-between gap-2 rounded-sm border border-line bg-input px-3 py-2 text-[12.5px]">
                    <span className="min-w-0 truncate text-text">{local}</span>
                    <span className="flex-shrink-0 text-text-dim">
                      {dado.qtd}× · <span className="font-mono text-text">{formatarMoeda(dado.valor)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Por faixa de valor</p>
              <div className="flex flex-col gap-1.5">
                {porFaixa.map(([faixa, dado]) => (
                  <div key={faixa} className="flex items-center justify-between gap-2 rounded-sm border border-line bg-input px-3 py-2 text-[12.5px]">
                    <span className="text-text">{FAIXA_ROTULO[faixa]}</span>
                    <span className="flex-shrink-0 text-text-dim">
                      {dado.qtd}× · <span className="font-mono text-text">{formatarMoeda(dado.valor)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
