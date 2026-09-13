import { ClipboardList, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  atualizarQuantidadeChecklistExtra,
  buscarChecklistPadrao,
  listarChecklistExtra,
  sincronizarChecklistExtraDoContrato,
  type ItemChecklistPadrao,
} from '../../lib/api/estoque';
import { SkeletonLinhas } from '../Skeleton';
import { EstadoVazio } from '../ui/EmptyState';
import { mensagemDeErro } from '../../lib/erroAmigavel';
import { formatarData } from '../../lib/status';
import type { ChecklistExtraItem, ContratoComLead } from '../../lib/types';

/** Checklist de carga de um evento — reaproveita `checklist_padrao_itens`
    (itens do pacote contratado, filtrados pela faixa de convidados, mesma
    lógica que existia na Logística antes do romaneio ser removido) +
    itens extras vindos de "Observações / brindes" do contrato (pedido do
    usuário, "Etapa 7"), com quantidade editável. Botão "Imprimir" usa a
    classe `.print-area` (ver index.css) — só isso aparece na impressão. */
export function ChecklistEvento({ contrato }: { contrato: ContratoComLead }) {
  const [padrao, setPadrao] = useState<ItemChecklistPadrao[] | null>(null);
  const [extras, setExtras] = useState<ChecklistExtraItem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setPadrao(null);
    setExtras(null);
    setErro(null);
    Promise.all([
      buscarChecklistPadrao(contrato.orcamento_id, contrato.convidados),
      // sincroniza antes de listar — rede de segurança pra observações
      // que já existiam antes desta sincronização existir (ver nota em
      // sincronizarChecklistExtraDoContrato).
      sincronizarChecklistExtraDoContrato(contrato.id, contrato.observacoes_brindes).then(() => listarChecklistExtra(contrato.id)),
    ])
      .then(([p, e]) => {
        if (cancelado) return;
        setPadrao(p);
        setExtras(e);
      })
      .catch((err) => !cancelado && setErro(mensagemDeErro(err)));
    return () => {
      cancelado = true;
    };
  }, [contrato.id, contrato.orcamento_id, contrato.convidados, contrato.observacoes_brindes]);

  function aoMudarQuantidade(item: ChecklistExtraItem, quantidade: number) {
    if (quantidade <= 0) return;
    setExtras((atual) => (atual ? atual.map((i) => (i.id === item.id ? { ...i, quantidade } : i)) : atual));
    atualizarQuantidadeChecklistExtra(item.id, quantidade).catch((e) => window.alert(mensagemDeErro(e)));
  }

  const carregando = padrao === null || extras === null;
  const semItens = !carregando && padrao.length === 0 && (extras?.length ?? 0) === 0;

  return (
    <div className="border-t border-line pt-4">
      <div className="print-area">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <strong className="text-text">Checklist de carga — {contrato.lead?.nome ?? '—'}</strong>
            <p className="text-[12.5px] text-text-dim">
              {formatarData(contrato.data_evento)} · {contrato.local || 'local não informado'} · {contrato.convidados ?? '—'} convidados
            </p>
          </div>
          <button type="button" onClick={() => window.print()} className="print:hidden flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
            <Printer className="h-3.5 w-3.5" strokeWidth={2} /> Imprimir
          </button>
        </div>

        {erro && <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}
        {carregando && !erro && <SkeletonLinhas />}

        {!carregando && !erro && (
          <>
            {semItens ? (
              <EstadoVazio
                Icone={ClipboardList}
                titulo="Nenhum item de checklist pra este contrato"
                descricao={
                  !contrato.orcamento_id
                    ? 'Criado sem orçamento — sem itens pra saber o pacote contratado — e nenhuma observação/brinde cadastrado.'
                    : 'Nenhuma observação/brinde cadastrado.'
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 print:grid-cols-1">
                {/* Mini-card de vidro leve por item (DESIGN.md > Tables &
                    Lists, 2026-09-09), não mais linha sólida crua. 2
                    colunas a partir de sm (pedido do usuário, 2026-09-13
                    — 1 coluna deixava espaço em branco enorme, já que
                    cada item é só um texto curto + quantidade); 1 coluna
                    na impressão continua mais fácil de riscar item por
                    item no papel. */}
                {padrao.map((item, i) => (
                  <div key={`p-${i}`} className="list-row flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-text">{item.descricao}</span>
                    <span className="font-mono text-text-dim">
                      {item.quantidade} {item.unidade ?? ''}
                    </span>
                  </div>
                ))}
                {(extras ?? []).map((item) => (
                  <div key={item.id} className="list-row flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-text">
                      {item.descricao} <span className="text-[10.5px] uppercase tracking-wide text-text-faint">brinde</span>
                    </span>
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={item.quantidade}
                      onChange={(e) => aoMudarQuantidade(item, Number(e.target.value))}
                      className="print:hidden w-16 rounded-sm border border-line bg-panel px-2 py-1 text-right font-mono text-[12.5px] text-text outline-none focus:border-ops"
                    />
                    <span className="hidden print:inline font-mono text-text-dim">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
