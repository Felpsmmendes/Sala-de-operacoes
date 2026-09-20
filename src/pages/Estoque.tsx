import { AlertTriangle, ArrowLeftRight, Calculator, CheckCircle2, ClipboardList, Link2, Package, ShoppingCart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { diasAteEvento, listarContratos } from '../lib/api/contratos';
import {
  cancelarCompra,
  criarCompra,
  criarItem,
  definirDataChegadaCompra,
  excluirItem,
  listarCompras,
  listarDescricoesChecklistNaoVinculadas,
  listarItens,
  listarMovimentos,
  receberCompra,
  registrarMovimento,
  vincularDescricaoAoEstoque,
  type CompraComItem,
  type ItemEstoque,
  type MovimentoComItem,
  type NovoItemEstoque,
  type TipoMovimento,
} from '../lib/api/estoque';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { Drawer } from '../components/ui/Drawer';
import { EstadoVazio } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Reveal } from '../components/ui/Reveal';
import { ChecklistEvento } from '../components/estoque/ChecklistEvento';
import { ItemForm } from '../components/estoque/ItemForm';
import { ModalCompra } from '../components/estoque/ModalCompra';
import { ModalMovimento } from '../components/estoque/ModalMovimento';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { formatarData, formatarMoeda } from '../lib/status';
import { useConfirmDialog } from '../lib/useConfirmDialog';
import type { ContratoComLead } from '../lib/types';

function ehCritico(item: ItemEstoque) {
  return item.estoque_atual <= item.estoque_minimo;
}

const TIPO_MOVIMENTO_ROTULO: Record<TipoMovimento, string> = { entrada: 'Entrada', saida: 'Saída', avaria: 'Avaria/quebra', reintegracao: 'Reintegração' };
const TIPO_MOVIMENTO_TOM: Record<TipoMovimento, 'sucesso' | 'pendente' | 'perigo'> = { entrada: 'sucesso', reintegracao: 'sucesso', saida: 'pendente', avaria: 'perigo' };
// "Zerado" (2026-09-18, REVIEW_DECISOES_V2 Parte 6/07) é o caso extremo
// de crítico — nunca uma seção à parte no dado, só um recorte visual
// mais urgente. `ehCritico` acima continua com o significado de sempre
// (usado na borda vermelha/badge do item); esta função só existe pra
// separar os 3 blocos do painel de situação e o filtro sem contar o
// mesmo item duas vezes.
function ehZerado(item: ItemEstoque) {
  return item.estoque_atual <= 0;
}

type FiltroSituacao = 'todos' | 'zerados' | 'criticos' | 'saudaveis';

// Abas (2026-09-19, SPEC_CAMADA2 2C — "Estoque como módulo"): "avancado"
// voltou a se chamar "Itens" (nome original, ver histórico) e ganhou
// duas vizinhas novas — Movimentações (histórico completo, antes só via
// drawer por item) e Compras (antes só existia em Logística; aqui é a
// MESMA função `listarCompras`/`receberCompra`/`cancelarCompra`, nunca
// uma segunda fonte de verdade). Checklists/Avarias/Vínculos ficam como
// já eram — o documento de reorganização não pedia pra tirar nenhuma.
type Aba = 'checklists' | 'itens' | 'movimentacoes' | 'compras' | 'avarias' | 'vinculos';

/** Toda ação de uma linha (excluir/receber/cancelar) precisa tratar erro —
    sem isso, uma restrição do banco (ex.: item com movimentação não pode
    ser excluído) vira uma rejeição de promise não capturada, silenciosa
    pro usuário. */
function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

export default function Estoque() {
  // Achado da auditoria de UX (2026-09-06): calculadora, cadastro, lista,
  // vínculo checklist↔estoque, compras e avarias ficavam tudo empilhado
  // numa rolagem só — o gestor entrava querendo fazer UMA coisa (ex.
  // marcar uma compra recebida) e precisava rolar por tudo antes de
  // chegar lá. Vira abas, mesmo padrão já usado no CRM (`Crm.tsx`).
  const [aba, setAba] = useState<Aba>('checklists');
  const [contratos, setContratos] = useState<ContratoComLead[]>([]);
  const [checklistAbertoId, setChecklistAbertoId] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [compras, setCompras] = useState<CompraComItem[]>([]);
  const [avarias, setAvarias] = useState<MovimentoComItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoItem, setSalvandoItem] = useState(false);
  const [movimentoAberto, setMovimentoAberto] = useState<ItemEstoque | null>(null);
  const [compraAberta, setCompraAberta] = useState<ItemEstoque | null>(null);
  // Histórico no drawer (REVIEW_DECISOES_V2, Parte 7/16, P2) — carregado
  // sob demanda (só quando o item é aberto), não junto com o resto da
  // tela: histórico de todo item de uma vez não teria uso na maior parte
  // do tempo.
  const [historicoItem, setHistoricoItem] = useState<ItemEstoque | null>(null);
  const [historicoMovimentos, setHistoricoMovimentos] = useState<MovimentoComItem[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  // Movimentações (aba nova, SPEC_CAMADA2 2C) — carregado sob demanda no
  // primeiro clique na aba, não junto com o resto (histórico completo de
  // TODO item não tem uso na maior parte do tempo, mesmo raciocínio do
  // drawer por item acima).
  const [movimentos, setMovimentos] = useState<MovimentoComItem[] | null>(null);
  const [carregandoMovimentos, setCarregandoMovimentos] = useState(false);
  const [convidadosCalc, setConvidadosCalc] = useState('');
  // Seletor de evento (REVIEW_DECISOES_V2, Parte 7/16, P2) — antes só
  // dava pra digitar um número solto de convidados; escolher um evento
  // real preenche esse número sozinho (ainda editável depois, pra
  // simular um cenário hipotético sem estar ligado a nenhum evento).
  const [eventoCalcId, setEventoCalcId] = useState('');
  const [naoVinculados, setNaoVinculados] = useState<string[]>([]);
  const [vinculando, setVinculando] = useState<string | null>(null);
  // painel de situação + filtro (2026-09-18, REVIEW_DECISOES_V2 Estoque
  // P1) — UM estado só, reaproveitado tanto pelos 3 blocos clicáveis
  // (visíveis em qualquer aba) quanto pelo segmented control da lista em
  // "Avançado": clicar num bloco já muda de aba E filtra, sem duplicar
  // a ideia de filtro em dois lugares diferentes.
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>('todos');
  // "Ações rápidas" (2026-09-18) — ação primeiro (+ Entrada/− Saída já
  // visíveis no topo), item depois: escolhe no seletor e o modal de
  // movimentação já abre com o tipo certo pré-selecionado.
  const [itemRapidoId, setItemRapidoId] = useState('');
  const [tipoMovimentoInicial, setTipoMovimentoInicial] = useState<TipoMovimento>('saida');
  const confirmar = useConfirmDialog();

  /** Achado de UX (2026-09-13) — excluir item de estoque não tinha
      NENHUMA confirmação, um clique errado apagava o cadastro na hora
      (histórico de movimentos que dependem dele fica órfão). Mesmo
      padrão dos outros "excluir definitivo" do sistema. */
  async function aoExcluirItem(item: ItemEstoque) {
    const ok = await confirmar.pedir({
      titulo: 'Excluir item do estoque',
      mensagem: `Excluir "${item.nome}" do galpão? O histórico de movimentos já registrado com este item é mantido, mas o item some do cadastro.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    excluirItem(item.id).then(carregar).catch(aoFalhar);
  }

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [i, c, a, nv, ct] = await Promise.all([listarItens(), listarCompras(), listarMovimentos('avaria'), listarDescricoesChecklistNaoVinculadas(), listarContratos()]);
      setItens(i);
      setCompras(c);
      setAvarias(a);
      setNaoVinculados(nv);
      setContratos(ct.filter((c2) => c2.status !== 'cancelado'));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  async function aoVincular(descricao: string, estoqueItemId: string) {
    setVinculando(descricao);
    try {
      await vincularDescricaoAoEstoque(descricao, estoqueItemId);
      await carregar();
    } catch (e) {
      aoFalhar(e);
    } finally {
      setVinculando(null);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function aoCriarItem(dados: NovoItemEstoque) {
    setSalvandoItem(true);
    try {
      await criarItem(dados);
      await carregar();
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setSalvandoItem(false);
    }
  }

  async function aoConfirmarMovimento(tipo: TipoMovimento, quantidade: number, observacao: string) {
    if (!movimentoAberto) return;
    try {
      await registrarMovimento({ itemId: movimentoAberto.id, tipo, quantidade, observacao: observacao || null });
      setMovimentoAberto(null);
      setItemRapidoId('');
      await carregar();
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  async function aoConfirmarCompra(quantidade: number, valorTotal: number, dataChegadaPrevista: string | null) {
    if (!compraAberta) return;
    try {
      await criarCompra({ itemId: compraAberta.id, quantidade, valorTotal, dataChegadaPrevista });
      setCompraAberta(null);
      await carregar();
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    }
  }

  function aoAbrirAbaMovimentacoes() {
    setAba('movimentacoes');
    if (movimentos != null || carregandoMovimentos) return;
    setCarregandoMovimentos(true);
    listarMovimentos()
      .then(setMovimentos)
      .catch((e) => {
        aoFalhar(e);
        setMovimentos([]);
      })
      .finally(() => setCarregandoMovimentos(false));
  }

  async function aoAbrirHistorico(item: ItemEstoque) {
    setHistoricoItem(item);
    setCarregandoHistorico(true);
    try {
      setHistoricoMovimentos(await listarMovimentos(undefined, item.id));
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setCarregandoHistorico(false);
    }
  }

  const itensCriticos = itens.filter(ehCritico);
  const comprasPendentes = compras.filter((c) => c.status === 'pendente');

  // 3 blocos mutuamente exclusivos (2026-09-18) — todo item cai em
  // exatamente um, nunca em dois (zerado não soma em crítico de novo).
  const itensZerados = useMemo(() => itens.filter(ehZerado), [itens]);
  const itensCriticosNaoZerados = useMemo(() => itens.filter((i) => ehCritico(i) && !ehZerado(i)), [itens]);
  const itensSaudaveis = useMemo(() => itens.filter((i) => !ehCritico(i)), [itens]);

  const itensFiltrados = useMemo(() => {
    const base = itens.filter((i) => {
      if (filtroSituacao === 'zerados') return ehZerado(i);
      if (filtroSituacao === 'criticos') return ehCritico(i) && !ehZerado(i);
      if (filtroSituacao === 'saudaveis') return !ehCritico(i);
      return true;
    });
    // Ordenação padrão (REVIEW_DECISOES_V2): zerados → críticos →
    // saudáveis, alfabético dentro de cada grupo — nunca uma lista sem
    // critério de ordem.
    const grupo = (i: ItemEstoque) => (ehZerado(i) ? 0 : ehCritico(i) ? 1 : 2);
    return [...base].sort((a, b) => grupo(a) - grupo(b) || a.nome.localeCompare(b.nome));
  }, [itens, filtroSituacao]);

  // "Impacto nos próximos eventos" (2026-09-18) — mesma conta da
  // Calculadora preditiva (consumo_por_pax × convidados), só que
  // automática pra cada evento dos próximos 7 dias, sem precisar digitar
  // nada. Avalia cada evento contra o estoque ATUAL, um de cada vez —
  // não soma a demanda de dois eventos na mesma semana (mesma limitação
  // já aceita na calculadora manual, não é escopo novo).
  const impactoEventos = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const em7dias = new Date();
    em7dias.setDate(em7dias.getDate() + 7);
    const em7diasStr = em7dias.toISOString().slice(0, 10);
    const proximos = contratos.filter((c) => c.data_evento >= hoje && c.data_evento <= em7diasStr).sort((a, b) => a.data_evento.localeCompare(b.data_evento));

    const linhas: { item: ItemEstoque; evento: ContratoComLead; necessario: number; deficit: number }[] = [];
    for (const ev of proximos) {
      if (!ev.convidados) continue;
      for (const item of itens) {
        if (item.consumo_por_pax == null) continue;
        const necessario = Math.round(item.consumo_por_pax * ev.convidados * 100) / 100;
        const deficit = Math.round((necessario - item.estoque_atual) * 100) / 100;
        if (deficit > 0) linhas.push({ item, evento: ev, necessario, deficit });
      }
    }
    return linhas;
  }, [contratos, itens]);

  const previsao = useMemo(() => {
    const convidados = Number(convidadosCalc) || 0;
    if (!convidados) return [];
    return itens
      .filter((i) => i.consumo_por_pax != null)
      .map((i) => {
        const necessario = Math.round((i.consumo_por_pax as number) * convidados * 100) / 100;
        return { item: i, necessario, deficit: Math.max(0, Math.round((necessario - i.estoque_atual) * 100) / 100) };
      });
  }, [itens, convidadosCalc]);

  const contratosParaCalculadora = useMemo(() => contratos.filter((c) => c.convidados != null).sort((a, b) => b.data_evento.localeCompare(a.data_evento)), [contratos]);

  function aoSelecionarEventoCalc(id: string) {
    setEventoCalcId(id);
    const c = contratosParaCalculadora.find((c) => c.id === id);
    setConvidadosCalc(c?.convidados != null ? String(c.convidados) : '');
  }

  return (
    <>
      <Cabecalho titulo="Estoque" subtitulo="Checklist de carga por evento, cadastro de itens, movimentações e compras do galpão." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Package} rotulo="Itens cadastrados" valor={String(itens.length)} legenda="No galpão" categoria="operacao" />
          <MetricCard Icone={AlertTriangle} rotulo="Nível crítico" valor={String(itensCriticos.length)} legenda="Abaixo do mínimo" categoria="operacao" />
          <MetricCard Icone={ShoppingCart} rotulo="Compras pendentes" valor={String(comprasPendentes.length)} legenda={formatarMoeda(comprasPendentes.reduce((s, c) => s + c.valor_total, 0))} categoria="operacao" />
          <MetricCard Icone={AlertTriangle} rotulo="Avarias registradas" valor={String(avarias.length)} legenda="Últimos 50 registros" categoria="operacao" />
        </MetricGrid>

        {/* Painel de situação + ações rápidas (2026-09-18,
            REVIEW_DECISOES_V2 Estoque P1) — substitui o banner que só
            aparecia com crítico; agora dá a foto inteira (inclusive "tá
            tudo OK") e é clicável em qualquer aba: clicar num bloco já
            muda pra "Avançado" com o filtro certo aplicado. */}
        {!carregando && itens.length > 0 && (
          <Panel className="mb-4">
            <PanelHeader titulo="Situação do estoque" desc="Clique num bloco pra ver a lista filtrada." />
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { f: 'saudaveis' as const, n: itensSaudaveis.length, rotulo: 'OK', cor: 'border-execucao/25 bg-execucao/8 text-execucao' },
                  { f: 'criticos' as const, n: itensCriticosNaoZerados.length, rotulo: 'Críticos', cor: 'border-pending/25 bg-pending/8 text-pending' },
                  { f: 'zerados' as const, n: itensZerados.length, rotulo: 'Zerados', cor: 'border-danger/25 bg-danger/8 text-danger' },
                ] as const
              ).map(({ f, n, rotulo, cor }) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFiltroSituacao(f);
                    setAba('itens');
                  }}
                  className={`flex flex-col items-center gap-0.5 rounded-md border px-3 py-2.5 transition-colors hover:border-line-strong ${cor}`}
                >
                  <span className="font-mono text-[22px] font-black leading-none">{n}</span>
                  <span className="text-[11px] font-semibold">{rotulo}</span>
                </button>
              ))}
            </div>

            {/* Ações rápidas — ação primeiro, item depois: escolhe no
                seletor e já abre o modal de movimentação com o tipo certo. */}
            <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
              <div className="min-w-[200px] flex-1">
                <Select rotulo="Ação rápida" categoria="operacao" value={itemRapidoId} onChange={(e) => setItemRapidoId(e.target.value)}>
                  <option value="">Selecione um item…</option>
                  {itens.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome} ({item.estoque_atual} {item.unidade})
                    </option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                disabled={!itemRapidoId}
                onClick={() => {
                  const item = itens.find((i) => i.id === itemRapidoId);
                  if (!item) return;
                  setTipoMovimentoInicial('entrada');
                  setMovimentoAberto(item);
                }}
                className="rounded-sm border border-execucao/30 bg-execucao/10 px-3 py-2 text-[12.5px] font-semibold text-execucao hover:bg-execucao/20 disabled:opacity-40"
              >
                + Entrada
              </button>
              <button
                type="button"
                disabled={!itemRapidoId}
                onClick={() => {
                  const item = itens.find((i) => i.id === itemRapidoId);
                  if (!item) return;
                  setTipoMovimentoInicial('saida');
                  setMovimentoAberto(item);
                }}
                className="rounded-sm border border-line bg-raised px-3 py-2 text-[12.5px] font-semibold text-text-dim hover:bg-input hover:text-text disabled:opacity-40"
              >
                − Saída
              </button>
            </div>
          </Panel>
        )}

        {/* "Impacto nos próximos eventos" (2026-09-18) — mesmo cálculo da
            Calculadora preditiva, automático pros eventos dos próximos 7
            dias, sem precisar digitar nada. */}
        {!carregando && (
          <Panel className="mb-4">
            <PanelHeader titulo="Impacto nos próximos eventos" desc="Itens que não cobrem a demanda projetada de um evento nos próximos 7 dias." />
            {impactoEventos.length === 0 ? (
              <p className="flex items-center gap-1.5 text-[12.5px] text-success">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                Nenhum impacto operacional nos próximos 7 dias
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {impactoEventos.map(({ item, evento, necessario, deficit }) => (
                  <div key={`${item.id}-${evento.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-danger/25 bg-danger/5 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <strong className="text-text">{item.nome}</strong>
                      <p className="text-[11.5px] text-text-dim">
                        Estoque: <span className="font-mono">{item.estoque_atual}</span>
                        {item.unidade} · {evento.lead?.nome ?? 'Evento'} — em {diasAteEvento(evento.data_evento)} dia(s)
                      </p>
                      <p className="text-[11.5px] text-text-faint">
                        Necessário: <span className="font-mono text-text">{necessario}</span> · Disponível: <span className="font-mono text-text">{item.estoque_atual}</span> · Déficit:{' '}
                        <span className="font-mono font-semibold text-danger">{deficit}</span> {item.unidade}
                      </p>
                    </div>
                    <button type="button" onClick={() => setCompraAberta(item)} className="flex-shrink-0 rounded-sm bg-accent px-3 py-1.5 text-[11.5px] font-semibold text-accent-ink hover:bg-accent-strong">
                      Gerar compra
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        {/* submenu horizontal, sempre visível — mesmo padrão do CRM */}
        <div className="scrollbar-none mb-5 flex gap-1 overflow-x-auto border-b border-line">
          {(
            [
              { id: 'checklists', rotulo: 'Checklists', Icone: ClipboardList, contagem: contratos.length },
              { id: 'itens', rotulo: 'Itens', Icone: Package },
              { id: 'movimentacoes', rotulo: 'Movimentações', Icone: ArrowLeftRight },
              { id: 'compras', rotulo: 'Compras', Icone: ShoppingCart, contagem: comprasPendentes.length },
              { id: 'avarias', rotulo: 'Avarias', Icone: AlertTriangle, contagem: avarias.length },
              { id: 'vinculos', rotulo: 'Vínculos', Icone: Link2, contagem: naoVinculados.length },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => (item.id === 'movimentacoes' ? aoAbrirAbaMovimentacoes() : setAba(item.id))}
              className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                aba === item.id ? 'border-ops text-ops' : 'border-transparent text-text-dim hover:text-text'
              }`}
            >
              <item.Icone className="h-4 w-4" strokeWidth={2} />
              {item.rotulo}
              {'contagem' in item && item.contagem > 0 && <span className="rounded-full bg-input px-1.5 text-[11px] text-text-faint">{item.contagem}</span>}
            </button>
          ))}
        </div>

        {aba === 'checklists' && (
          <Reveal>
          <Panel>
            <PanelHeader titulo="Checklist de carga por evento" desc="Itens do pacote contratado (padrão) + observações/brindes do contrato, por evento." />
            {carregando ? (
              <SkeletonLinhas />
            ) : contratos.length === 0 ? (
              <EstadoVazio Icone={ClipboardList} titulo="Nenhum contrato ativo ainda" descricao="O checklist de carga aparece aqui por evento assim que houver um contrato." />
            ) : (
              <div className="flex flex-col gap-3">
                {contratos.map((c) => (
                  <div key={c.id} className="rounded-md border border-line bg-input p-4">
                    <button type="button" onClick={() => setChecklistAbertoId((atual) => (atual === c.id ? null : c.id))} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
                      <div>
                        <strong className="text-[15px] text-text">{c.lead?.nome ?? '—'}</strong>
                        <p className="text-[12.5px] text-text-dim">
                          {formatarData(c.data_evento)} · {c.local || 'local não informado'} · {c.convidados ?? '—'} convidados
                        </p>
                      </div>
                      <span className="text-[12.5px] font-medium text-ops">{checklistAbertoId === c.id ? 'Fechar' : 'Ver checklist'}</span>
                    </button>
                    {checklistAbertoId === c.id && <ChecklistEvento contrato={c} />}
                  </div>
                ))}
              </div>
            )}
          </Panel>
          </Reveal>
        )}

        {aba === 'itens' && (
          <Reveal>
            <Panel className="mb-4">
              <PanelHeader titulo="Calculadora preditiva" desc="Quanto vai ser consumido pra X convidados, comparado com o que tem no galpão." acao={<Calculator className="h-4 w-4 text-text-faint" />} />
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  categoria="operacao"
                  value={eventoCalcId}
                  onChange={(e) => aoSelecionarEventoCalc(e.target.value)}
                >
                  <option value="">Cenário livre (sem evento)</option>
                  {contratosParaCalculadora.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatarData(c.data_evento)} — {c.lead?.nome ?? '—'} ({c.convidados} conv.)
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={1}
                  categoria="operacao"
                  value={convidadosCalc}
                  onChange={(e) => {
                    setEventoCalcId('');
                    setConvidadosCalc(e.target.value);
                  }}
                  placeholder="ou digite o número de convidados"
                />
              </div>
              {convidadosCalc &&
                (previsao.length === 0 ? (
                  <p className="text-sm text-text-dim">Nenhum item tem "consumo por convidado" cadastrado ainda.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {previsao.map(({ item, necessario, deficit }) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                        <span className="text-text">{item.nome}</span>
                        <span className="text-text-dim">
                          necessário <span className="font-mono text-text">{necessario}</span> {item.unidade} · tem <span className="font-mono text-text">{item.estoque_atual}</span>
                        </span>
                        {deficit > 0 ? <Badge tom="perigo" texto={`falta ${deficit} ${item.unidade}`} /> : <Badge tom="sucesso" texto="cobre a demanda" />}
                      </div>
                    ))}
                  </div>
                ))}
            </Panel>

            <Panel className="mb-4">
              <PanelHeader titulo="Novo item" desc="Cadastre bebidas, insumos, gelo ou descartáveis do galpão." />
              <ItemForm onSalvar={aoCriarItem} salvando={salvandoItem} />
            </Panel>

            <Panel>
              <PanelHeader
                titulo="Itens em estoque"
                desc={carregando ? undefined : `${itensFiltrados.length} de ${itens.length} item(ns)`}
                acao={
                  itens.length > 0 && (
                    <div className="inline-flex flex-wrap gap-0.5 rounded-sm border border-line bg-input p-0.5">
                      {(
                        [
                          { f: 'todos' as const, rotulo: 'Todos' },
                          { f: 'zerados' as const, rotulo: `Zerados ${itensZerados.length}` },
                          { f: 'criticos' as const, rotulo: `Críticos ${itensCriticosNaoZerados.length}` },
                          { f: 'saudaveis' as const, rotulo: `Saudáveis ${itensSaudaveis.length}` },
                        ] as const
                      ).map(({ f, rotulo }) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFiltroSituacao(f)}
                          className={`rounded-[5px] px-2.5 py-1 text-[11.5px] font-medium transition-colors ${filtroSituacao === f ? 'bg-raised text-ops' : 'text-text-dim hover:text-text'}`}
                        >
                          {rotulo}
                        </button>
                      ))}
                    </div>
                  )
                }
              />
              {carregando ? (
                <SkeletonLinhas />
              ) : itens.length === 0 ? (
                <EstadoVazio Icone={Package} titulo="Nenhum item cadastrado ainda" descricao="Cadastre bebidas, insumos, gelo ou descartáveis do galpão acima." />
              ) : itensFiltrados.length === 0 ? (
                <EstadoVazio Icone={Package} titulo="Nenhum item nesse filtro" />
              ) : (
                <div className="flex flex-col gap-2">
                  {itensFiltrados.map((item) => (
                    <div
                      key={item.id}
                      className={`flex flex-col gap-2 rounded-sm border border-line bg-input px-3 py-2.5 text-sm ${ehCritico(item) ? 'border-l-2 border-l-danger' : ''}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <strong className="text-text">{item.nome}</strong>
                          <span className="ml-2 text-[11.5px] uppercase tracking-wide text-text-faint">{item.categoria}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-text-dim">
                            {item.estoque_atual} / {item.estoque_minimo} {item.unidade}
                          </span>
                          {ehCritico(item) ? <Badge tom="perigo" texto="Crítico" /> : <Badge tom="sucesso" texto="OK" />}
                          <button type="button" onClick={() => aoAbrirHistorico(item)} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                            Histórico
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTipoMovimentoInicial('saida');
                              setMovimentoAberto(item);
                            }}
                            className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text"
                          >
                            Movimentar
                          </button>
                          {ehCritico(item) && (
                            <button type="button" onClick={() => setCompraAberta(item)} className="rounded-sm bg-accent px-2.5 py-1 text-[11.5px] font-semibold text-accent-ink hover:bg-accent-strong">
                              Gerar compra
                            </button>
                          )}
                          <button type="button" onClick={() => aoExcluirItem(item)} className="text-[11.5px] font-medium text-danger hover:underline">
                            Excluir
                          </button>
                        </div>
                      </div>
                      <ProgressBar
                        valor={item.estoque_minimo > 0 ? Math.min(100, (item.estoque_atual / item.estoque_minimo) * 100) : 100}
                        categoria={ehCritico(item) ? 'acao' : 'execucao'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </Reveal>
        )}

        {aba === 'movimentacoes' && (
          <Reveal>
          <Panel>
            <PanelHeader titulo="Movimentações" desc="Todo entrada/saída/avaria/reintegração registrado, de todos os itens." />
            {carregandoMovimentos ? (
              <SkeletonLinhas />
            ) : !movimentos || movimentos.length === 0 ? (
              <EstadoVazio Icone={ArrowLeftRight} titulo="Nenhuma movimentação registrada ainda" />
            ) : (
              <div className="flex flex-col gap-2">
                {movimentos.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                    <div className="flex items-center gap-2.5">
                      <Badge tom={TIPO_MOVIMENTO_TOM[m.tipo]} texto={TIPO_MOVIMENTO_ROTULO[m.tipo]} />
                      <span className="text-text">
                        {m.item?.nome ?? '—'} — {m.quantidade} {m.item?.unidade}
                      </span>
                      {m.observacao && <span className="text-text-faint">· {m.observacao}</span>}
                    </div>
                    <span className="flex-shrink-0 text-text-faint">{formatarData(m.criado_em)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          </Reveal>
        )}

        {aba === 'compras' && (
          <Reveal>
          <Panel>
            <PanelHeader titulo="Compras" desc="Mesma lista de Logística — pendentes, ordenadas pela chegada prevista." />
            {compras.length === 0 ? (
              <EstadoVazio Icone={ShoppingCart} titulo="Nenhuma compra registrada ainda" descricao="Compras entram aqui quando um item crítico gera uma compra." />
            ) : (
              <div className="flex flex-col gap-2">
                {[...compras]
                  .sort((a, b) => (a.data_chegada_prevista ?? '9999-99-99').localeCompare(b.data_chegada_prevista ?? '9999-99-99'))
                  .map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <strong className="text-text">{c.item?.nome ?? '—'}</strong>
                        <span className="ml-2 text-text-dim">
                          {c.quantidade} {c.item?.unidade} · {formatarMoeda(c.valor_total)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tom={c.status === 'recebido' ? 'sucesso' : c.status === 'cancelado' ? 'perigo' : 'pendente'} texto={c.status === 'recebido' ? 'Recebido' : c.status === 'cancelado' ? 'Cancelado' : 'Pendente'} />
                        {c.status === 'pendente' && (
                          <>
                            <div className="w-36">
                              <Input
                                type="date"
                                categoria="operacao"
                                value={c.data_chegada_prevista ?? ''}
                                onChange={(e) =>
                                  definirDataChegadaCompra(c.id, e.target.value || null)
                                    .then(carregar)
                                    .catch(aoFalhar)
                                }
                                title="Definir/editar chegada prevista"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => receberCompra(c).then(carregar).catch(aoFalhar)}
                              className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text"
                            >
                              Marcar recebido
                            </button>
                            <button type="button" onClick={() => cancelarCompra(c.id).then(carregar).catch(aoFalhar)} className="text-[11.5px] font-medium text-danger hover:underline">
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Panel>
          </Reveal>
        )}

        {aba === 'avarias' && (
          <Reveal>
          <Panel>
            <PanelHeader titulo="Histórico de avarias" desc="Quebras e perdas registradas." />
            {avarias.length === 0 ? (
              <EstadoVazio Icone={Package} titulo="Nenhuma avaria registrada" />
            ) : (
              <div className="flex flex-col gap-2">
                {avarias.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                    <span className="text-text">
                      {m.item?.nome ?? '—'} — {m.quantidade} {m.item?.unidade}
                      {m.observacao ? ` · ${m.observacao}` : ''}
                    </span>
                    <span className="text-text-faint">{formatarData(m.criado_em)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          </Reveal>
        )}

        {aba === 'vinculos' && (
          <Reveal>
          <Panel>
            <PanelHeader
              titulo="Vincular checklist de carga ao estoque"
              desc="Itens do checklist padrão (contratado no orçamento) que ainda não apontam pra um item real do galpão."
            />
            {naoVinculados.length === 0 ? (
              <p className="text-sm text-text-dim">Tudo vinculado ✓ — nenhuma descrição do checklist padrão pendente.</p>
            ) : itens.length === 0 ? (
              <p className="text-sm text-text-dim">Cadastre pelo menos um item do galpão na aba "Avançado" antes de vincular.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {naoVinculados.map((descricao) => (
                  <div key={descricao} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                    <span className="text-text">{descricao}</span>
                    <div className="w-48">
                      <Select categoria="operacao" disabled={vinculando === descricao} defaultValue="" onChange={(e) => e.target.value && aoVincular(descricao, e.target.value)}>
                        <option value="" disabled>
                          {vinculando === descricao ? 'Vinculando…' : 'Vincular a…'}
                        </option>
                        {itens.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nome}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          </Reveal>
        )}
      </Conteudo>

      {movimentoAberto && <ModalMovimento item={movimentoAberto} tipoInicial={tipoMovimentoInicial} onFechar={() => setMovimentoAberto(null)} onConfirmar={aoConfirmarMovimento} />}
      {compraAberta && <ModalCompra item={compraAberta} onFechar={() => setCompraAberta(null)} onConfirmar={aoConfirmarCompra} />}
      {confirmar.dialogo}

      {historicoItem && (
        <Drawer titulo={`Histórico — ${historicoItem.nome}`} onFechar={() => setHistoricoItem(null)}>
          {carregandoHistorico ? (
            <SkeletonLinhas />
          ) : historicoMovimentos.length === 0 ? (
            <EstadoVazio Icone={Package} titulo="Nenhuma movimentação registrada ainda" />
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              {historicoMovimentos.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2">
                  <div className="min-w-0">
                    <Badge tom={TIPO_MOVIMENTO_TOM[m.tipo]} texto={TIPO_MOVIMENTO_ROTULO[m.tipo]} />
                    <p className="mt-1 text-[11px] text-text-faint">{new Date(m.criado_em).toLocaleString('pt-BR')}</p>
                    {m.observacao && <p className="mt-0.5 truncate text-[11.5px] text-text-dim">{m.observacao}</p>}
                  </div>
                  <span className="flex-shrink-0 font-mono text-text">
                    {m.tipo === 'saida' || m.tipo === 'avaria' ? '−' : '+'}
                    {m.quantidade} {historicoItem.unidade}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Drawer>
      )}
    </>
  );
}
