import { CheckCircle2, Copy, ExternalLink, FileDown, Mail, MessageCircle, MessageSquare, Pencil, Phone, Receipt, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { atualizarOrcamento, criarOrcamento, calcularValorHoraAdicional, calcularValorServico, listarOrcamentos } from '../lib/api/orcamentos';
import { criarContrato, listarContratos } from '../lib/api/contratos';
import { listarLeads, registrarInteracao } from '../lib/api/leads';
import { listarRegioesFrete } from '../lib/api/regioesFrete';
import { listarServicos } from '../lib/api/servicos';
import { listarVeiculos } from '../lib/api/veiculos';
import { Cabecalho, Conteudo } from '../components/Layout';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { EstadoVazio } from '../components/ui/EmptyState';
import { ServicoCard } from '../components/orcamentos/ServicoCard';
import { SeletorCliente } from '../components/orcamentos/SeletorCliente';
import { Input } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Select } from '../components/ui/Select';
import { montarMensagemOrcamento, type ItemSelecionado } from '../lib/mensagemOrcamento';
import { calcularFrete } from '../lib/freteConfig';
import { gerarPdfProposta } from '../lib/pdfProposta';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { useConfirmDialog } from '../lib/useConfirmDialog';
import { formatarMoeda, formatarData, normalizarTexto } from '../lib/status';
import type { ContratoComLead, Lead, OrcamentoCompleto, RegiaoFrete, Servico, Veiculo } from '../lib/types';

const CATEGORIAS: { chave: Servico['categoria']; titulo: string }[] = [
  { chave: 'bar', titulo: 'Bar' },
  { chave: 'atracao', titulo: 'Atrações fotográficas' },
  { chave: 'adicional', titulo: 'Serviços adicionais' },
];

export default function Orcamentos() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [orcamentos, setOrcamentos] = useState<OrcamentoCompleto[]>([]);
  const [regioes, setRegioes] = useState<RegiaoFrete[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // "Converter em contrato" (2026-09-14) — não precisa de coluna nova em
  // orçamento: um orçamento "já virou contrato" quando existe um contrato
  // com esse `orcamento_id`, então só carrega a lista de contratos junto
  // pra saber quais ids já têm.
  const [contratos, setContratos] = useState<ContratoComLead[]>([]);
  const [convertendoId, setConvertendoId] = useState<string | null>(null);
  const confirmarConversao = useConfirmDialog();

  const [leadId, setLeadId] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [convidados, setConvidados] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  // hora adicional por item (pedido do usuário, 2026-09-09) — servico_id -> horas.
  const [horasPorServico, setHorasPorServico] = useState<Map<string, number>>(new Map());
  // frete cobrado do cliente (2026-09-09) — região+veículo, mesma fórmula
  // da calculadora de Logística, só que aqui é uma estimativa (sem
  // pedágio/barmen/lalamove, ainda não dá pra saber no estágio de orçamento).
  const [regiaoFreteId, setRegiaoFreteId] = useState('');
  const [veiculoFreteId, setVeiculoFreteId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [buscaOrcamentos, setBuscaOrcamentos] = useState('');

  useEffect(() => {
    Promise.all([listarLeads(), listarServicos(), listarOrcamentos(), listarRegioesFrete(), listarVeiculos(), listarContratos()])
      .then(([l, s, o, rg, ve, c]) => {
        setLeads(l);
        setServicos(s);
        setOrcamentos(o);
        setRegioes(rg);
        setVeiculos(ve);
        setContratos(c);
      })
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, []);

  const orcamentoIdsComContrato = useMemo(() => new Set(contratos.map((c) => c.orcamento_id).filter((id): id is string => id != null)), [contratos]);

  /** Cria um contrato já pré-preenchido com os dados do orçamento — poupa
      redigitar cliente/data/convidados/valor na tela de Contratos. O custo
      real do frete (se tinha) vira despesa automática (ver criarContrato);
      sinal/saldo (20/80) são colunas geradas no banco a partir do valor
      total, não se define aqui. */
  async function aoConverterEmContrato(orc: OrcamentoCompleto) {
    if (!orc.data_evento) {
      toast.aviso('Este orçamento não tem data prevista — edite e defina uma data antes de converter em contrato.');
      return;
    }
    const ok = await confirmarConversao.pedir({
      titulo: 'Converter em contrato',
      mensagem: `Criar um contrato para ${orc.lead?.nome ?? 'este lead'} com base neste orçamento? Os dados (cliente, data, convidados, valor) são copiados automaticamente.`,
      textoConfirmar: 'Converter',
    });
    if (!ok) return;

    setConvertendoId(orc.id);
    try {
      const contrato = await criarContrato({
        orcamentoId: orc.id,
        leadId: orc.lead_id,
        dataEvento: orc.data_evento,
        local: null,
        convidados: orc.convidados,
        valorTotal: orc.valor_total,
        valorFreteCusto: orc.valor_frete_custo || undefined,
      });
      setContratos((prev) => [contrato, ...prev]);
      toast.sucesso(`Contrato criado para ${orc.lead?.nome ?? 'lead'}! Acesse Contratos para finalizar.`);
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setConvertendoId(null);
    }
  }

  const convidadosNum = convidados ? Number(convidados) : null;

  const itens: ItemSelecionado[] = useMemo(
    () =>
      servicos
        .filter((s) => selecionados.has(s.id))
        .map((servico) => {
          const valor = calcularValorServico(servico, convidadosNum);
          return {
            servico,
            valor,
            horasAdicionais: horasPorServico.get(servico.id) ?? 0,
            valorHoraAdicional: calcularValorHoraAdicional(servico, valor),
          };
        }),
    [servicos, selecionados, convidadosNum, horasPorServico]
  );

  const regiaoSelecionada = regioes.find((r) => r.id === regiaoFreteId) ?? null;
  const veiculoSelecionado = veiculos.find((v) => v.id === veiculoFreteId) ?? null;

  // frete cobrado do cliente (pedido do usuário, 2026-09-09) — mesma
  // fórmula da calculadora de Logística (src/lib/freteConfig.ts), só que
  // aqui é uma estimativa de orçamento: sem pedágio/barmen/lalamove, que
  // só se sabe de verdade mais perto do evento.
  const resultadoFrete = useMemo(() => {
    if (!regiaoSelecionada || !veiculoSelecionado) return null;
    return calcularFrete({
      tipoVeiculo: veiculoSelecionado.tipo,
      consumoMedio: veiculoSelecionado.consumo_medio,
      kmIdaVolta: regiaoSelecionada.km_aproximado * 2,
      pedagios: 0,
      qtdBarmenCarro: 0,
      pedagiosBarmen: 0,
      valorLalamove: 0,
    });
  }, [regiaoSelecionada, veiculoSelecionado]);

  const valorFreteCobrado = resultadoFrete?.valorFrete ?? 0;
  const valorFreteCusto = resultadoFrete?.custoReal ?? 0;

  // busca nos orçamentos salvos (pedido do usuário, 2026-09-14) — só por
  // nome do cliente, que é o que dá pra reconhecer de cabeça; normaliza
  // acento/maiúscula pra "joao" achar "João".
  const orcamentosFiltrados = useMemo(() => {
    const termo = normalizarTexto(buscaOrcamentos.trim());
    if (!termo) return orcamentos;
    return orcamentos.filter((o) => normalizarTexto(o.lead?.nome ?? '').includes(termo));
  }, [orcamentos, buscaOrcamentos]);

  const totalServicos = itens.reduce((soma, i) => soma + i.valor + i.horasAdicionais * i.valorHoraAdicional, 0);
  const total = totalServicos + valorFreteCobrado;
  const sinal = Math.round(total * 0.2 * 100) / 100;
  const saldo = Math.round(total * 0.8 * 100) / 100;

  const leadSelecionado = useMemo(() => leads.find((l) => l.id === leadId) ?? null, [leads, leadId]);

  // Indicador de progresso (REVIEW_DECISOES_V2, Parte 4/16) — resolve o
  // "wizard obrigatório" que foi explicitamente rejeitado (Parte 7): o
  // formulário continua sendo uma página só, sem travar navegação entre
  // seções, só sinaliza em que pé a pessoa está.
  const etapasOrcamento = useMemo(() => {
    const passos = [
      { rotulo: 'Cliente', feita: !!leadId },
      { rotulo: 'Evento', feita: !!dataEvento && !!convidados },
      { rotulo: 'Serviços', feita: itens.length > 0 },
      { rotulo: 'Revisão', feita: mensagem != null },
    ];
    const indiceAtual = passos.findIndex((p) => !p.feita);
    return passos.map((p, i) => ({ ...p, estado: p.feita ? ('concluida' as const) : i === indiceAtual ? ('atual' as const) : ('futura' as const) }));
  }, [leadId, dataEvento, convidados, itens.length, mensagem]);

  // Breakdown por categoria (2026-09-17, "P2/P3") — mesma soma de cada
  // item (valor + hora adicional) que já alimenta `totalServicos`, só
  // separada por categoria de serviço pra dar contexto no resumo.
  const breakdownCategoria = useMemo(() => {
    const somaCategoria = (cat: 'bar' | 'atracao') => itens.filter((i) => i.servico.categoria === cat).reduce((s, i) => s + i.valor + i.horasAdicionais * i.valorHoraAdicional, 0);
    return { bar: somaCategoria('bar'), atracao: somaCategoria('atracao') };
  }, [itens]);

  function alternarServico(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) {
        novo.delete(id);
        setHorasPorServico((m) => {
          if (!m.has(id)) return m;
          const n = new Map(m);
          n.delete(id);
          return n;
        });
      } else {
        novo.add(id);
      }
      return novo;
    });
  }

  function definirHorasAdicionais(servicoId: string, horas: number) {
    setHorasPorServico((atual) => {
      const novo = new Map(atual);
      if (horas > 0) novo.set(servicoId, horas);
      else novo.delete(servicoId);
      return novo;
    });
  }

  // atalho "aplicar hora extra pra todo mundo da categoria de uma vez"
  // (pedido do usuário, 2026-09-10) — antes só dava pra marcar item por
  // item; num evento grande com vários serviços de bar (ou várias
  // atrações fotográficas) pedindo a mesma hora adicional, isso poupa
  // clicar em cada um.
  function definirHorasAdicionaisPorCategoria(categoria: 'bar' | 'atracao', horas: number) {
    setHorasPorServico((atual) => {
      const novo = new Map(atual);
      for (const i of itens) {
        if (i.servico.categoria !== categoria) continue;
        if (horas > 0) novo.set(i.servico.id, horas);
        else novo.delete(i.servico.id);
      }
      return novo;
    });
  }

  async function recarregarOrcamentos() {
    setOrcamentos(await listarOrcamentos());
  }

  async function aoSalvar() {
    if (!leadId || itens.length === 0) {
      setErroSalvar('Selecione um cliente e ao menos um serviço.');
      return;
    }
    setSalvando(true);
    setErroSalvar(null);
    try {
      const dados = {
        leadId,
        dataEvento: dataEvento || null,
        convidados: convidadosNum,
        itens: itens.map((i) => ({
          servico_id: i.servico.id,
          quantidade: 1,
          valor_unitario: i.valor + i.horasAdicionais * i.valorHoraAdicional,
          horas_adicionais: i.horasAdicionais,
          valor_hora_adicional: i.valorHoraAdicional,
        })),
        regiaoFreteId: regiaoFreteId || null,
        veiculoId: veiculoFreteId || null,
        valorFreteCobrado,
        valorFreteCusto,
      };
      if (editandoId) {
        await atualizarOrcamento(editandoId, dados);
      } else {
        await criarOrcamento(dados);
      }
      await recarregarOrcamentos();
      aoCancelarEdicao();
    } catch (e) {
      setErroSalvar(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  function aoEditar(o: OrcamentoCompleto) {
    setEditandoId(o.id);
    setLeadId(o.lead_id);
    setDataEvento(o.data_evento ?? '');
    setConvidados(o.convidados != null ? String(o.convidados) : '');
    setSelecionados(new Set(o.itens.map((i) => i.servico_id)));
    setHorasPorServico(new Map(o.itens.filter((i) => i.horas_adicionais > 0).map((i) => [i.servico_id, i.horas_adicionais])));
    setRegiaoFreteId(o.regiao_frete_id ?? '');
    setVeiculoFreteId(o.veiculo_id ?? '');
    setErroSalvar(null);
    setMensagem(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function aoCancelarEdicao() {
    setEditandoId(null);
    setLeadId('');
    setDataEvento('');
    setConvidados('');
    setSelecionados(new Set());
    setHorasPorServico(new Map());
    setRegiaoFreteId('');
    setVeiculoFreteId('');
  }

  function aoGerarMensagem() {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) {
      setErroSalvar('Selecione um cliente antes de gerar a mensagem.');
      return;
    }
    const frete = regiaoSelecionada && valorFreteCobrado > 0 ? { regiaoNome: regiaoSelecionada.nome, valor: valorFreteCobrado } : null;
    const texto = montarMensagemOrcamento({ lead, dataEvento: dataEvento || null, convidados: convidadosNum, itens, total, frete });
    setMensagem(texto);
    setCopiado(false);
    // registra sozinho no histórico de conversa do lead — é assim que um
    // CRM de verdade sabe que essa proposta foi enviada, sem digitar de
    // novo o que já foi gerado aqui.
    registrarInteracao(lead.id, 'mensagem_whatsapp', texto).catch(() => {});
  }

  function aoGerarPdf() {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) {
      setErroSalvar('Selecione um cliente antes de gerar o PDF.');
      return;
    }
    if (itens.length === 0) {
      setErroSalvar('Selecione ao menos um serviço antes de gerar o PDF.');
      return;
    }
    const frete = regiaoSelecionada && valorFreteCobrado > 0 ? { regiaoNome: regiaoSelecionada.nome, valor: valorFreteCobrado } : null;
    gerarPdfProposta({ lead, dataEvento: dataEvento || null, convidados: convidadosNum, itens, total, frete });
  }

  return (
    <>
      <Cabecalho titulo="Gerador de Orçamentos" subtitulo="Coquetelaria + atrações, cálculo automático do modelo 20% sinal / 80% quitação." />
      <Conteudo>
        {carregando && <SkeletonLinhas />}
        {erro && <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        {!carregando && !erro && (
          <div className="mb-4 flex items-center gap-1.5 overflow-x-auto py-1">
            {etapasOrcamento.map((e, i) => (
              <div key={e.rotulo} className="flex items-center gap-1.5">
                {i > 0 && <span className="h-px w-5 flex-shrink-0 bg-line" />}
                <span
                  className={`flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    e.estado === 'concluida'
                      ? 'border-success/30 bg-success/10 text-success'
                      : e.estado === 'atual'
                        ? erroSalvar
                          ? 'border-danger/40 bg-danger/15 text-danger'
                          : 'border-pending/40 bg-pending/15 text-pending'
                        : 'border-line bg-input text-text-faint'
                  }`}
                >
                  {e.estado === 'concluida' ? '✓' : e.estado === 'atual' ? '●' : '○'} {e.rotulo}
                </span>
              </div>
            ))}
          </div>
        )}

        {!carregando && !erro && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            {/* "Dados do evento" (cliente/data/convidados) vem ANTES do resumo no
                HTML de propósito — achado do usuário (2026-09-07): no celular/tela
                estreita (sem a coluna lateral do desktop), a ordem no HTML é o que
                manda, e o resumo vazio aparecia primeiro, escondendo o campo
                "Cliente" lá embaixo. `lg:order-*` continua deixando o resumo como
                coluna lateral fixa à direita no desktop, sem mudar nada lá. */}
            <div className="flex flex-col gap-4 lg:order-1">
              <Panel>
                <PanelHeader titulo="Dados do evento" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="sm:col-span-3">
                    <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Cliente</span>
                    <SeletorCliente
                      leads={leads}
                      leadId={leadId}
                      onSelecionar={setLeadId}
                      onCriado={(lead) => {
                        setLeads((prev) => [lead, ...prev]);
                        setLeadId(lead.id);
                      }}
                    />
                  </label>
                  <Input rotulo="Data prevista" categoria="dinheiro" type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
                  <div className="sm:col-span-2">
                    <Input rotulo="Convidados" categoria="dinheiro" type="number" min={1} value={convidados} onChange={(e) => setConvidados(e.target.value)} placeholder="Ex: 120" />
                  </div>

                  {/* frete cobrado do cliente (2026-09-09) — opcional: sem região
                      escolhida, o orçamento não cobra frete separado nenhum. */}
                  <Select rotulo="Região (frete)" categoria="dinheiro" value={regiaoFreteId} onChange={(e) => setRegiaoFreteId(e.target.value)}>
                    <option value="">Sem frete cobrado</option>
                    {regioes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome} ({r.km_aproximado}km ida)
                      </option>
                    ))}
                  </Select>
                  <div className="sm:col-span-2">
                    <Select rotulo="Veículo (frete)" categoria="dinheiro" value={veiculoFreteId} onChange={(e) => setVeiculoFreteId(e.target.value)} disabled={!regiaoFreteId}>
                      <option value="">Selecione o veículo…</option>
                      {veiculos.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nome}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {resultadoFrete && (
                    <p className="sm:col-span-3 text-[11.5px] text-text-dim">
                      Frete estimado: <span className="font-mono text-text">{formatarMoeda(resultadoFrete.valorFrete)}</span> cobrado do cliente (custo real da empresa:{' '}
                      <span className="font-mono">{formatarMoeda(resultadoFrete.custoReal)}</span>, com 30% de margem) — sem pedágio/lalamove, ajusta depois na Logística se precisar.
                    </p>
                  )}
                </div>
              </Panel>

              {CATEGORIAS.map((cat) => {
                const itensCategoria = servicos.filter((s) => s.categoria === cat.chave);
                if (itensCategoria.length === 0) return null;
                return (
                  <Panel key={cat.chave}>
                    <PanelHeader titulo={cat.titulo} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {itensCategoria.map((servico) => (
                        <ServicoCard
                          key={servico.id}
                          servico={servico}
                          selecionado={selecionados.has(servico.id)}
                          valor={calcularValorServico(servico, convidadosNum)}
                          onToggle={() => alternarServico(servico.id)}
                        />
                      ))}
                    </div>
                  </Panel>
                );
              })}

              <Panel>
                <PanelHeader
                  titulo="Orçamentos salvos"
                  desc={buscaOrcamentos ? `${orcamentosFiltrados.length} de ${orcamentos.length} orçamento(s)` : `${orcamentos.length} orçamento(s)`}
                  acao={
                    orcamentos.length > 0 && (
                      <div className="relative w-48">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" strokeWidth={2} />
                        <Input value={buscaOrcamentos} onChange={(e) => setBuscaOrcamentos(e.target.value)} placeholder="Buscar cliente…" className="pl-8" />
                      </div>
                    )
                  }
                />
                {orcamentos.length === 0 ? (
                  <EstadoVazio Icone={Receipt} titulo="Nenhum orçamento salvo ainda" />
                ) : orcamentosFiltrados.length === 0 ? (
                  <EstadoVazio Icone={Search} titulo="Nenhum orçamento encontrado" descricao={`Nenhum cliente bate com "${buscaOrcamentos}".`} />
                ) : (
                  <div className="flex flex-col gap-2">
                    {orcamentosFiltrados.map((o) => (
                      <div key={o.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-sm border px-3 py-2.5 text-sm ${o.id === editandoId ? 'border-money bg-raised' : 'border-line bg-input'}`}>
                        <div className="min-w-0">
                          <strong className="block truncate text-text">{o.lead?.nome ?? '—'}</strong>
                          <span className="text-[11.5px] text-text-dim">
                            {formatarData(o.data_evento)} · {o.itens.length} serviço(s)
                          </span>
                          {/* contato do lead (pedido do usuário, 2026-09-14) — só o
                              que tiver cadastrado, nunca inventa um "—" pros dois. */}
                          {(o.lead?.telefone || o.lead?.email) && (
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-text-faint">
                              {o.lead?.telefone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 flex-shrink-0" strokeWidth={2} /> {o.lead.telefone}
                                </span>
                              )}
                              {o.lead?.email && (
                                <span className="flex min-w-0 items-center gap-1">
                                  <Mail className="h-3 w-3 flex-shrink-0" strokeWidth={2} />
                                  <span className="truncate">{o.lead.email}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <span className="font-mono text-text">{formatarMoeda(o.valor_total)}</span>
                          {/* "virou contrato" é derivado da lista de contratos (algum
                              com orcamento_id === o.id), não uma coluna própria do
                              orçamento — ver orcamentoIdsComContrato acima. */}
                          {orcamentoIdsComContrato.has(o.id) ? (
                            <span className="flex flex-shrink-0 items-center gap-1.5 text-[11px] font-semibold text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                              Contrato criado
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => aoConverterEmContrato(o)}
                              disabled={convertendoId === o.id}
                              className="flex flex-shrink-0 items-center gap-1.5 rounded-sm border border-money/30 bg-money/8 px-2.5 py-1.5 text-[12px] font-semibold text-money transition-colors hover:bg-money/15 disabled:opacity-50"
                            >
                              <Receipt className="h-3.5 w-3.5" strokeWidth={2} />
                              {convertendoId === o.id ? 'Convertendo…' : 'Converter em contrato'}
                            </button>
                          )}
                          {o.lead?.id && (
                            <Link to={`/crm?lead=${o.lead.id}`} title="Ver lead no CRM" className="rounded-sm border border-line p-1.5 text-text-dim hover:bg-panel hover:text-people">
                              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                            </Link>
                          )}
                          <button type="button" onClick={() => aoEditar(o)} title="Editar orçamento" className="rounded-sm border border-line p-1.5 text-text-dim hover:bg-panel hover:text-money">
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            <div className="flex flex-col gap-4 lg:order-2">
              <Panel className="lg:sticky lg:top-4">
                <PanelHeader titulo="Resumo do orçamento" desc="Atualiza conforme você seleciona os serviços." />
                <div className="mb-4 border-b border-line pb-4">
                  <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Total estimado</span>
                  <strong className="font-mono text-3xl font-semibold text-pending">{formatarMoeda(total)}</strong>
                </div>
                {(breakdownCategoria.bar > 0 || breakdownCategoria.atracao > 0) && (
                  <div className="mb-4 flex flex-col gap-2 border-b border-line pb-4">
                    {breakdownCategoria.bar > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[11.5px]">
                          <span className="text-text-faint">Bar & Coquetelaria</span>
                          <span className="font-mono font-semibold text-money">{formatarMoeda(breakdownCategoria.bar)}</span>
                        </div>
                        <ProgressBar valor={total > 0 ? (breakdownCategoria.bar / total) * 100 : 0} categoria="dinheiro" />
                      </div>
                    )}
                    {breakdownCategoria.atracao > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[11.5px]">
                          <span className="text-text-faint">Atrações fotográficas</span>
                          <span className="font-mono font-semibold text-schedule">{formatarMoeda(breakdownCategoria.atracao)}</span>
                        </div>
                        <ProgressBar valor={total > 0 ? (breakdownCategoria.atracao / total) * 100 : 0} categoria="agenda" />
                      </div>
                    )}
                  </div>
                )}
                <div className="mb-4 flex flex-col gap-2.5 text-sm">
                  {itens.length === 0 && <p className="text-text-faint">Nenhum serviço selecionado</p>}
                  {(itens.some((i) => i.servico.categoria === 'bar') || itens.some((i) => i.servico.categoria === 'atracao')) && (
                    <div className="mb-1 flex flex-wrap gap-1.5 border-b border-line pb-3">
                      {itens.some((i) => i.servico.categoria === 'bar') && (
                        <button
                          type="button"
                          onClick={() => definirHorasAdicionaisPorCategoria('bar', 1)}
                          className="rounded-full border border-money/30 bg-money/10 px-2.5 py-1 text-[10.5px] font-semibold text-money hover:bg-money/20"
                        >
                          Todo o bar +1h
                        </button>
                      )}
                      {itens.some((i) => i.servico.categoria === 'atracao') && (
                        <button
                          type="button"
                          onClick={() => definirHorasAdicionaisPorCategoria('atracao', 1)}
                          className="rounded-full border border-money/30 bg-money/10 px-2.5 py-1 text-[10.5px] font-semibold text-money hover:bg-money/20"
                        >
                          Todas as fotos +1h
                        </button>
                      )}
                    </div>
                  )}
                  {itens.map((i) => {
                    const podeHoraExtra = i.servico.categoria === 'bar' || i.servico.categoria === 'atracao';
                    const valorExtra = i.horasAdicionais * i.valorHoraAdicional;
                    return (
                      <div key={i.servico.id} className="flex flex-col gap-1.5 border-b border-line pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between gap-2 text-text-dim">
                          <span className="truncate">{i.servico.nome}</span>
                          <span className="font-mono text-text">{formatarMoeda(i.valor + valorExtra)}</span>
                        </div>
                        {podeHoraExtra && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="mr-0.5 text-[10px] uppercase tracking-wide text-text-faint">
                              +hora ({i.servico.categoria === 'bar' ? '5h' : '4h'} padrão)
                            </span>
                            {[0, 1, 2, 3, 4].map((h) => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => definirHorasAdicionais(i.servico.id, h)}
                                className={`rounded-sm border px-1.5 py-0.5 text-[10.5px] font-semibold ${
                                  i.horasAdicionais === h ? 'border-money bg-money/15 text-money' : 'border-line text-text-faint hover:bg-raised hover:text-text'
                                }`}
                              >
                                {h}h
                              </button>
                            ))}
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              placeholder="outro"
                              value={[0, 1, 2, 3, 4].includes(i.horasAdicionais) ? '' : i.horasAdicionais}
                              onChange={(e) => definirHorasAdicionais(i.servico.id, e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                              className="w-14 rounded-sm border border-line bg-input px-1.5 py-0.5 text-[10.5px] text-text outline-none focus:border-money"
                            />
                            {i.horasAdicionais > 0 && <span className="font-mono text-[10.5px] text-pending">+{formatarMoeda(valorExtra)}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {valorFreteCobrado > 0 && (
                    <div className="flex justify-between gap-2 border-t border-line pt-2 text-text-dim">
                      <span className="truncate">🚚 Frete ({regiaoSelecionada?.nome})</span>
                      <span className="font-mono text-text">{formatarMoeda(valorFreteCobrado)}</span>
                    </div>
                  )}
                  {itens.length > 0 && (
                    <>
                      <div className={`flex justify-between text-text-dim ${valorFreteCobrado > 0 ? '' : 'mt-2 border-t border-line pt-2'}`}>
                        <span>Sinal (20%)</span>
                        <span className="font-mono text-text">{formatarMoeda(sinal)}</span>
                      </div>
                      <div className="flex justify-between text-text-dim">
                        <span>Saldo até D-20 (80%)</span>
                        <span className="font-mono text-text">{formatarMoeda(saldo)}</span>
                      </div>
                    </>
                  )}
                </div>
                {erroSalvar && <p className="mb-3 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{erroSalvar}</p>}
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={aoGerarMensagem} className="flex items-center justify-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong">
                    <MessageSquare className="h-4 w-4" strokeWidth={2} /> Gerar mensagem
                  </button>
                  <button type="button" onClick={aoGerarPdf} className="flex items-center justify-center gap-2 rounded-sm border border-line px-4 py-2.5 text-sm font-medium text-text-dim hover:bg-raised hover:text-text">
                    <FileDown className="h-4 w-4" strokeWidth={2} /> Gerar PDF da proposta
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={aoSalvar}
                      disabled={salvando}
                      className="flex-1 rounded-sm border border-line px-4 py-2.5 text-sm font-medium text-text-dim hover:bg-raised hover:text-text disabled:opacity-50"
                    >
                      {salvando ? 'Salvando…' : editandoId ? 'Atualizar orçamento' : 'Salvar orçamento'}
                    </button>
                    {editandoId && (
                      <button type="button" onClick={aoCancelarEdicao} title="Cancelar edição" className="rounded-sm border border-line px-3 text-text-dim hover:bg-raised hover:text-text">
                        <X className="h-4 w-4" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                  {editandoId && <p className="text-center text-[11.5px] text-pending">Editando orçamento salvo — as alterações substituem os serviços originais.</p>}
                </div>
              </Panel>

              {mensagem && (
                <Panel>
                  <PanelHeader titulo="Mensagem gerada" />
                  {/* achado do usuário (2026-09-07): com o texto novo por serviço
                      (bem mais longo que antes), a caixa com altura travada
                      (max-h-80 + scroll interno) competia com a rolagem da
                      página — dava pra "perder" a caixa no meio da leitura ao
                      rolar. Sem altura máxima: a caixa cresce com o conteúdo,
                      só a página rola, sem scroll aninhado. */}
                  <pre className="mb-3 whitespace-pre-wrap rounded-sm border border-line bg-input p-3 font-sans text-[13px] leading-relaxed text-text">{mensagem}</pre>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(mensagem)
                          .then(() => setCopiado(true))
                          .catch(() => toast.aviso('Não foi possível copiar automaticamente — selecione e copie o texto manualmente.'));
                      }}
                      className="flex items-center gap-2 rounded-sm border border-line px-4 py-2 text-sm font-medium text-text-dim hover:bg-raised hover:text-text"
                    >
                      <Copy className="h-3.5 w-3.5" strokeWidth={2} /> {copiado ? 'Copiado!' : 'Copiar mensagem'}
                    </button>
                    {leadSelecionado?.telefone && (
                      <a
                        href={`https://wa.me/55${leadSelecionado.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-sm border border-execucao/30 bg-execucao/10 px-4 py-2 text-sm font-semibold text-execucao transition-colors hover:bg-execucao/20"
                      >
                        <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} /> Abrir no WhatsApp
                      </a>
                    )}
                  </div>
                </Panel>
              )}
            </div>
          </div>
        )}
      </Conteudo>
      {confirmarConversao.dialogo}
    </>
  );
}
