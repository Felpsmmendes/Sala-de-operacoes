import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { atualizarHorarioAtracao, listarItensParaHorario, type ItemParaHorario } from '../../lib/api/orcamentos';
import { mensagemDeErro } from '../../lib/erroAmigavel';
import type { ContratoComLead, FormaPagamento } from '../../lib/types';

const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-money';
const campoP = 'rounded-sm border border-line bg-input px-2.5 py-1.5 text-[12.5px] text-text outline-none focus:border-money';
const rotulo = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint';

const FORMA_ROTULO: Record<FormaPagamento, string> = { pix: 'PIX', boleto: 'Boleto', cartao: 'Cartão de crédito' };

/** "14:30:00" (formato que volta do Postgres) -> "14:30" (formato que o
    `<input type="time">` entende). */
function soMinutos(t: string | null): string {
  return t ? t.slice(0, 5) : '';
}

export type DadosEdicaoContrato = {
  local: string;
  convidados: number | null;
  valorTotal: number;
  formaPagamento: FormaPagamento | null;
  observacoesBrindes: string | null;
  horarioChegadaConvidados: string | null;
  horarioChegadaEquipe: string | null;
  horarioFimServico: string | null;
  horarioSaidaEquipe: string | null;
  horarioInicioBar: string | null;
};

/** Edição de um contrato já criado (pedido do usuário, 2026-09-09) — hoje
    só existia geração de PIX e marcar pago, nada de editar os dados em
    si. Os horários por atração (um campo por item) salvam na hora, à
    parte do resto do formulário — são de uma tabela diferente
    (`orcamento_itens`), não dá pra empacotar num "Salvar" só. */
export function ModalEditarContrato({ contrato, onFechar, onSalvar, salvando }: { contrato: ContratoComLead; onFechar: () => void; onSalvar: (dados: DadosEdicaoContrato) => void; salvando: boolean }) {
  const [local, setLocal] = useState(contrato.local ?? '');
  const [convidados, setConvidados] = useState(contrato.convidados != null ? String(contrato.convidados) : '');
  const [valorTotal, setValorTotal] = useState(String(contrato.valor_total));
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | ''>(contrato.forma_pagamento ?? '');
  const [observacoes, setObservacoes] = useState(contrato.observacoes_brindes ?? '');
  const [horChegadaConvidados, setHorChegadaConvidados] = useState(soMinutos(contrato.horario_chegada_convidados));
  const [horChegadaEquipe, setHorChegadaEquipe] = useState(soMinutos(contrato.horario_chegada_equipe));
  const [horFimServico, setHorFimServico] = useState(soMinutos(contrato.horario_fim_servico));
  const [horSaidaEquipe, setHorSaidaEquipe] = useState(soMinutos(contrato.horario_saida_equipe));
  const [horInicioBar, setHorInicioBar] = useState(soMinutos(contrato.horario_inicio_bar));

  const [itens, setItens] = useState<ItemParaHorario[] | null>(null);
  const [horariosAtracao, setHorariosAtracao] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!contrato.orcamento_id) {
      setItens([]);
      return;
    }
    listarItensParaHorario(contrato.orcamento_id)
      .then((lista) => {
        setItens(lista);
        setHorariosAtracao(new Map(lista.map((i) => [i.id, soMinutos(i.horario_inicio_atracao)])));
      })
      .catch(() => setItens([]));
  }, [contrato.orcamento_id]);

  const temBar = (itens ?? []).some((i) => i.categoria === 'bar');
  const atracoes = (itens ?? []).filter((i) => i.categoria === 'atracao');

  function aoMudarHorarioAtracao(itemId: string, valor: string) {
    setHorariosAtracao((m) => new Map(m).set(itemId, valor));
    atualizarHorarioAtracao(itemId, valor || null).catch((e) => window.alert(mensagemDeErro(e)));
  }

  const valido = local.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text">Editar contrato — {contrato.lead?.nome ?? '—'}</h3>
          <button type="button" onClick={onFechar} className="text-text-faint hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-3 border-b border-line pb-5">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Dados gerais</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2">
              <span className={rotulo}>Local (obrigatório)</span>
              <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: Espaço Villa Bisutti" className={campo} />
            </label>
            <label>
              <span className={rotulo}>Convidados</span>
              <input type="number" min={1} value={convidados} onChange={(e) => setConvidados(e.target.value)} className={campo} />
            </label>
            <label>
              <span className={rotulo}>Valor total</span>
              <input type="number" min={0} step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} className={campo} />
              <span className="mt-1 block text-[10.5px] text-text-faint">Recalcula sinal/saldo sozinho — confira se já tinha marcado pago com o valor antigo.</span>
            </label>
            <label>
              <span className={rotulo}>Forma de pagamento</span>
              <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)} className={campo}>
                <option value="">Não definida</option>
                {(Object.keys(FORMA_ROTULO) as FormaPagamento[]).map((f) => (
                  <option key={f} value={f}>
                    {FORMA_ROTULO[f]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <span className={rotulo}>Observações / brindes</span>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder={'Uma linha por item — ex:\nGarrafa de espumante personalizada\nLembrancinha pros noivos'}
              className={`${campo} resize-y`}
            />
            <span className="mt-1 block text-[10.5px] text-text-faint">Cada linha vira um item extra no checklist de carga — ainda não conectado (depende do checklist de Estoque).</span>
          </label>
        </div>

        <div className="mb-5 flex flex-col gap-3 border-b border-line pb-5">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Horários do evento (pro Roteiro do Evento)</p>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className={rotulo}>Chegada dos convidados</span>
              <input type="time" value={horChegadaConvidados} onChange={(e) => setHorChegadaConvidados(e.target.value)} className={campo} />
            </label>
            <label>
              <span className={rotulo}>Chegada da equipe</span>
              <input type="time" value={horChegadaEquipe} onChange={(e) => setHorChegadaEquipe(e.target.value)} className={campo} />
            </label>
            <label>
              <span className={rotulo}>Fim do serviço</span>
              <input type="time" value={horFimServico} onChange={(e) => setHorFimServico(e.target.value)} className={campo} />
            </label>
            <label>
              <span className={rotulo}>Saída da equipe</span>
              <input type="time" value={horSaidaEquipe} onChange={(e) => setHorSaidaEquipe(e.target.value)} className={campo} />
            </label>
            {temBar && (
              <label>
                <span className={rotulo}>Início do bar</span>
                <input type="time" value={horInicioBar} onChange={(e) => setHorInicioBar(e.target.value)} className={campo} />
              </label>
            )}
          </div>

          {atracoes.length > 0 && (
            <div>
              <span className={rotulo}>Início de cada atração</span>
              <div className="flex flex-col gap-2">
                {atracoes.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                    <span className="text-text">{item.nome}</span>
                    <input type="time" value={horariosAtracao.get(item.id) ?? ''} onChange={(e) => aoMudarHorarioAtracao(item.id, e.target.value)} className={campoP} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!contrato.orcamento_id && <p className="text-[11.5px] text-text-faint">Contrato criado sem orçamento — sem itens pra saber se tem bar/atração, só os horários gerais acima.</p>}
        </div>

        <button
          type="button"
          disabled={!valido || salvando}
          onClick={() =>
            onSalvar({
              local: local.trim(),
              convidados: convidados ? Number(convidados) : null,
              valorTotal: Number(valorTotal) || 0,
              formaPagamento: formaPagamento || null,
              observacoesBrindes: observacoes.trim() || null,
              horarioChegadaConvidados: horChegadaConvidados || null,
              horarioChegadaEquipe: horChegadaEquipe || null,
              horarioFimServico: horFimServico || null,
              horarioSaidaEquipe: horSaidaEquipe || null,
              horarioInicioBar: horInicioBar || null,
            })
          }
          className="w-full rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
