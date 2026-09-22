import { ChevronRight, MessageCircle, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listarContratos } from '../lib/api/contratos';
import { listarFunis } from '../lib/api/funis';
import { atualizarLead, listarInteracoesDoLead, obterLead } from '../lib/api/leads';
import { listarOrcamentos } from '../lib/api/orcamentos';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { Panel, PanelHeader } from '../components/Panel';
import { Select } from '../components/ui/Select';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { funilDoLead, formatarData, formatarMoeda, TIPO_INTERACAO_ROTULO } from '../lib/status';
import { toast } from '../lib/toast';
import type { ContratoComLead, FunilLead, Lead, LeadInteracao, OrcamentoCompleto } from '../lib/types';

const STATUS_ORCAMENTO_ROTULO: Record<string, string> = { rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', recusado: 'Recusado' };

/** Rótulo de "quando" pra agrupar a timeline (Hoje/Ontem/data) — mesma
    ideia do mockup do documento, sem inventar nenhum dado novo: só
    reagrupa `criado_em` das interações que `listarInteracoesDoLead`
    já retorna. */
function rotuloDia(dataIso: string): string {
  const data = dataIso.slice(0, 10);
  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (data === hoje) return 'Hoje';
  if (data === ontem) return 'Ontem';
  return formatarData(dataIso).toUpperCase();
}

/** Página do lead (2026-09-19, SPEC_CAMADA2 2A — "Detalhe do Lead") —
    complementa (não substitui) o painel rápido de edição que já existe
    inline em `components/crm/DetalheLead.tsx` (usado na aba Leads do
    CRM pra editar sem sair da lista); esta página é pra quando o gestor
    quer o histórico completo — timeline de interações + orçamentos e
    contrato vinculados — que o painel inline não mostra. */
export default function LeadDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [funis, setFunis] = useState<FunilLead[]>([]);
  const [interacoes, setInteracoes] = useState<LeadInteracao[]>([]);
  const [orcamentos, setOrcamentos] = useState<OrcamentoCompleto[]>([]);
  const [contratos, setContratos] = useState<ContratoComLead[]>([]);
  const [mudandoFunil, setMudandoFunil] = useState(false);

  async function carregar() {
    if (!id) return;
    setCarregando(true);
    setErro(null);
    try {
      const [ld, fs, inter, orc, ctr] = await Promise.all([obterLead(id), listarFunis(), listarInteracoesDoLead(id), listarOrcamentos(), listarContratos()]);
      setLead(ld);
      setFunis(fs);
      setInteracoes(inter);
      setOrcamentos(orc.filter((o) => o.lead_id === id));
      setContratos(ctr.filter((c) => c.lead_id === id));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function aoMudarFunil(funilId: string) {
    if (!lead) return;
    setMudandoFunil(true);
    try {
      const atualizado = await atualizarLead(lead.id, { status: funilId });
      setLead(atualizado);
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setMudandoFunil(false);
    }
  }

  const waLink = useMemo(() => {
    if (!lead?.telefone) return null;
    const numero = lead.telefone.replace(/\D/g, '');
    return `https://wa.me/55${numero}`;
  }, [lead?.telefone]);

  if (carregando) {
    return (
      <>
        <Cabecalho titulo="Lead" subtitulo="Carregando…" />
        <Conteudo>
          <p className="text-text-dim">Carregando…</p>
        </Conteudo>
      </>
    );
  }

  if (erro || !lead) {
    return (
      <>
        <Cabecalho titulo="Lead não encontrado" subtitulo="" />
        <Conteudo>
          <p className="text-text-dim">{erro ?? 'Este lead não existe ou foi removido.'}</p>
          <Link to="/crm" className="mt-4 inline-block text-accent hover:underline">
            ← Voltar para o CRM
          </Link>
        </Conteudo>
      </>
    );
  }

  const info = funilDoLead(funis, lead.status);

  return (
    <>
      <Cabecalho titulo={lead.nome} subtitulo={lead.valor_estimado != null ? `${formatarMoeda(lead.valor_estimado)} · ${info.rotulo}` : info.rotulo} />
      <Conteudo>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Badge tom={info.tom} texto={info.rotulo} />
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-md border border-execucao/30 bg-execucao/10 px-3 py-1.5 text-[12.5px] font-semibold text-execucao hover:bg-execucao/20">
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} /> WhatsApp
            </a>
          )}
          <Link to={`/crm?lead=${lead.id}`} className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12.5px] text-text-dim hover:bg-raised hover:text-text">
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Editar
          </Link>
          <div className="w-48">
            <Select categoria="pessoas" value={lead.status} onChange={(e) => aoMudarFunil(e.target.value)} disabled={mudandoFunil}>
              {funis.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <Panel>
              <PanelHeader titulo="Timeline" desc="Histórico de interações com este lead." />
              {interacoes.length === 0 ? (
                <p className="text-[13px] text-text-dim">Nenhuma interação registrada ainda — use a aba Conversas no CRM pra começar.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {Object.entries(
                    interacoes.reduce<Record<string, LeadInteracao[]>>((grupos, i) => {
                      const chave = rotuloDia(i.criado_em);
                      (grupos[chave] ??= []).push(i);
                      return grupos;
                    }, {})
                  ).map(([dia, itens]) => (
                    <div key={dia}>
                      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-faint">{dia}</p>
                      <div className="flex flex-col gap-2">
                        {itens.map((i) => (
                          <div key={i.id} className="rounded-sm border border-line bg-input px-3 py-2.5">
                            <p className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">{TIPO_INTERACAO_ROTULO[i.tipo]}</p>
                            <p className="whitespace-pre-wrap text-[13px] text-text">{i.conteudo}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="flex flex-col gap-4">
            <Panel>
              <PanelHeader titulo="Dados" />
              <div className="flex flex-col divide-y divide-line text-[13px]">
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-text-dim">Telefone</span>
                  <span className="text-text">{lead.telefone || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-text-dim">E-mail</span>
                  <span className="truncate text-text">{lead.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-text-dim">Origem</span>
                  <span className="text-text">{lead.origem || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-text-dim">Cadastrado em</span>
                  <span className="text-text">{formatarData(lead.criado_em)}</span>
                </div>
              </div>
            </Panel>

            {orcamentos.length > 0 && (
              <Panel>
                <PanelHeader titulo="Orçamentos vinculados" />
                <div className="flex flex-col gap-1.5">
                  {orcamentos.map((o) => (
                    <Link key={o.id} to="/orcamentos" className="group flex items-center justify-between gap-2 rounded-sm border border-line bg-input px-3 py-2 text-[12.5px] hover:bg-raised">
                      <span className="text-text">{formatarMoeda(o.valor_total)}</span>
                      <span className="flex items-center gap-1.5 text-text-faint">
                        {STATUS_ORCAMENTO_ROTULO[o.status] ?? o.status}
                        <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={2} />
                      </span>
                    </Link>
                  ))}
                </div>
              </Panel>
            )}

            {contratos.length > 0 && (
              <Panel>
                <PanelHeader titulo="Contrato vinculado" />
                <div className="flex flex-col gap-1.5">
                  {contratos.map((c) => (
                    <Link key={c.id} to="/contratos" className="group flex items-center justify-between gap-2 rounded-sm border border-line bg-input px-3 py-2 text-[12.5px] hover:bg-raised">
                      <span className="text-text">{formatarMoeda(c.valor_total)}</span>
                      <span className="flex items-center gap-1.5 text-text-faint">
                        {c.status === 'ativo' ? 'Ativo' : c.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                        <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={2} />
                      </span>
                    </Link>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        </div>
      </Conteudo>
    </>
  );
}
