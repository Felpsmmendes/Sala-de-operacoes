import { Copy, FileDown, MessageSquare, Pencil, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { atualizarOrcamento, criarOrcamento, calcularValorServico, listarOrcamentos } from '../lib/api/orcamentos';
import { listarLeads, registrarInteracao } from '../lib/api/leads';
import { listarServicos } from '../lib/api/servicos';
import { Cabecalho, Conteudo } from '../components/Layout';
import { Panel, PanelHeader } from '../components/Panel';
import { ServicoCard } from '../components/orcamentos/ServicoCard';
import { SeletorCliente } from '../components/orcamentos/SeletorCliente';
import { montarMensagemOrcamento, type ItemSelecionado } from '../lib/mensagemOrcamento';
import { gerarPdfProposta } from '../lib/pdfProposta';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarMoeda, formatarData } from '../lib/status';
import type { Lead, OrcamentoCompleto, Servico } from '../lib/types';

const CATEGORIAS: { chave: Servico['categoria']; titulo: string }[] = [
  { chave: 'bar', titulo: 'Bar' },
  { chave: 'atracao', titulo: 'Atrações fotográficas' },
  { chave: 'adicional', titulo: 'Serviços adicionais' },
];

export default function Orcamentos() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [orcamentos, setOrcamentos] = useState<OrcamentoCompleto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [leadId, setLeadId] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [convidados, setConvidados] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listarLeads(), listarServicos(), listarOrcamentos()])
      .then(([l, s, o]) => {
        setLeads(l);
        setServicos(s);
        setOrcamentos(o);
      })
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, []);

  const convidadosNum = convidados ? Number(convidados) : null;

  const itens: ItemSelecionado[] = useMemo(
    () =>
      servicos
        .filter((s) => selecionados.has(s.id))
        .map((servico) => ({ servico, valor: calcularValorServico(servico, convidadosNum) })),
    [servicos, selecionados, convidadosNum]
  );

  const total = itens.reduce((soma, i) => soma + i.valor, 0);
  const sinal = Math.round(total * 0.2 * 100) / 100;
  const saldo = Math.round(total * 0.8 * 100) / 100;

  function alternarServico(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      novo.has(id) ? novo.delete(id) : novo.add(id);
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
        itens: itens.map((i) => ({ servico_id: i.servico.id, quantidade: 1, valor_unitario: i.valor })),
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
  }

  function aoGerarMensagem() {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) {
      setErroSalvar('Selecione um cliente antes de gerar a mensagem.');
      return;
    }
    const texto = montarMensagemOrcamento({ lead, dataEvento: dataEvento || null, convidados: convidadosNum, itens, total });
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
    gerarPdfProposta({ lead, dataEvento: dataEvento || null, convidados: convidadosNum, itens, total });
  }

  return (
    <>
      <Cabecalho titulo="Gerador de Orçamentos" subtitulo="Coquetelaria + atrações, cálculo automático do modelo 20% sinal / 80% quitação." />
      <Conteudo>
        {carregando && <p className="text-sm text-text-dim">Carregando…</p>}
        {erro && <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

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
                  <label>
                    <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Data prevista</span>
                    <input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent" />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Convidados</span>
                    <input type="number" min={1} value={convidados} onChange={(e) => setConvidados(e.target.value)} placeholder="Ex: 120" className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent" />
                  </label>
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
                <PanelHeader titulo="Orçamentos salvos" desc={`${orcamentos.length} orçamento(s)`} />
                {orcamentos.length === 0 ? (
                  <p className="text-sm text-text-dim">Nenhum orçamento salvo ainda.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {orcamentos.map((o) => (
                      <div key={o.id} className={`flex items-center justify-between gap-3 rounded-sm border px-3 py-2.5 text-sm ${o.id === editandoId ? 'border-accent bg-raised' : 'border-line bg-input'}`}>
                        <div className="min-w-0">
                          <strong className="block truncate text-text">{o.lead?.nome ?? '—'}</strong>
                          <span className="text-[11.5px] text-text-dim">{formatarData(o.data_evento)} · {o.itens.length} serviço(s)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-text">{formatarMoeda(o.valor_total)}</span>
                          <button type="button" onClick={() => aoEditar(o)} title="Editar orçamento" className="rounded-sm border border-line p-1.5 text-text-dim hover:bg-panel hover:text-accent">
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
                <div className="mb-4 flex flex-col gap-1.5 text-sm">
                  {itens.length === 0 && <p className="text-text-faint">Nenhum serviço selecionado</p>}
                  {itens.map((i) => (
                    <div key={i.servico.id} className="flex justify-between gap-2 text-text-dim">
                      <span className="truncate">{i.servico.nome}</span>
                      <span className="font-mono text-text">{formatarMoeda(i.valor)}</span>
                    </div>
                  ))}
                  {itens.length > 0 && (
                    <>
                      <div className="mt-2 flex justify-between border-t border-line pt-2 text-text-dim">
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
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(mensagem)
                        .then(() => setCopiado(true))
                        .catch(() => window.alert('Não foi possível copiar automaticamente — selecione e copie o texto manualmente.'));
                    }}
                    className="flex items-center gap-2 rounded-sm border border-line px-4 py-2 text-sm font-medium text-text-dim hover:bg-raised hover:text-text"
                  >
                    <Copy className="h-3.5 w-3.5" strokeWidth={2} /> {copiado ? 'Copiado!' : 'Copiar mensagem'}
                  </button>
                </Panel>
              )}
            </div>
          </div>
        )}
      </Conteudo>
    </>
  );
}
