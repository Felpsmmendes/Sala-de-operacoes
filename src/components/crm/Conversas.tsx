import { Search, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listarInteracoesDoLead, registrarInteracao } from '../../lib/api/leads';
import { Badge } from '../Badge';
import { SkeletonLinhas } from '../Skeleton';
import { EstadoVazio } from '../ui/EmptyState';
import { Select } from '../ui/Select';
import { mensagemDeErro } from '../../lib/erroAmigavel';
import { toast } from '../../lib/toast';
import { funilDoLead, TIPO_INTERACAO_ROTULO, formatarData, formatarMoeda } from '../../lib/status';
import type { FunilLead, Lead, LeadInteracao, TipoInteracao } from '../../lib/types';

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

function Avatar({ nome, tamanho = 'sm' }: { nome: string; tamanho?: 'sm' | 'lg' }) {
  const classe = tamanho === 'lg' ? 'h-16 w-16 text-xl' : 'h-10 w-10 text-[13px]';
  return <span className={`flex flex-shrink-0 items-center justify-center rounded-full bg-people/20 font-semibold text-people ${classe}`}>{iniciais(nome)}</span>;
}

/**
 * Aba "Conversas" do CRM — pedido do usuário: uma experiência de
 * conversa de verdade, no espírito do WhatsApp (lista de contatos à
 * esquerda, thread no meio, dados do cliente à direita), separada da
 * lista/funil de leads. Registra no mesmo `lead_interacoes` de sempre —
 * a mensagem de orçamento continua se auto-registrando aqui.
 */
export function Conversas({ leads, funis }: { leads: Lead[]; funis: FunilLead[] }) {
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(leads[0]?.id ?? null);
  const [interacoes, setInteracoes] = useState<LeadInteracao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [tipo, setTipo] = useState<TipoInteracao>('nota');
  const [conteudo, setConteudo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!selecionadoId && leads.length > 0) setSelecionadoId(leads[0].id);
  }, [leads, selecionadoId]);

  const leadSelecionado = leads.find((l) => l.id === selecionadoId) ?? null;

  async function carregarInteracoes(id: string) {
    setCarregando(true);
    try {
      setInteracoes(await listarInteracoesDoLead(id));
    } catch (e) {
      aoFalhar(e);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (selecionadoId) carregarInteracoes(selecionadoId);
    else setInteracoes([]);
  }, [selecionadoId]);

  async function aoEnviar() {
    if (!selecionadoId || !conteudo.trim()) return;
    setEnviando(true);
    try {
      await registrarInteracao(selecionadoId, tipo, conteudo.trim());
      setConteudo('');
      await carregarInteracoes(selecionadoId);
    } catch (e) {
      aoFalhar(e);
    } finally {
      setEnviando(false);
    }
  }

  const leadsFiltrados = leads.filter((l) => l.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="flex h-[72vh] min-h-[520px] flex-col overflow-hidden rounded-lg border border-line lg:grid lg:grid-cols-[260px_1fr_260px]">
      {/* ---- coluna esquerda: lista de contatos ---- */}
      {/* No mobile (2026-09-19, "navegação mobile" — achado do usuário:
          "as conversas" quebradas) isto empilha com a thread abaixo; sem
          `max-h`/`flex-shrink-0`, as duas linhas implícitas do grid
          dividiam a altura de forma imprevisível (auto-sizing não
          propaga altura pros filhos `flex-1 overflow-y-auto`), então a
          lista de contatos podia engolir a tela inteira sem sobrar
          espaço real pra thread. `lg:` volta a ser coluna de grid — o
          `max-h` não faz sentido lá, a altura já vem do `h-[72vh]` do
          container inteiro. */}
      <div className="flex max-h-[240px] flex-shrink-0 flex-col border-b border-line bg-panel lg:max-h-none lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 border-b border-line p-3">
          <Search className="h-4 w-4 flex-shrink-0 text-text-faint" strokeWidth={2} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar lead…"
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-faint"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {leadsFiltrados.length === 0 ? (
            <EstadoVazio Icone={Search} titulo="Nenhum lead encontrado" />
          ) : (
            leadsFiltrados.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelecionadoId(l.id)}
                className={`flex w-full items-center gap-3 border-b border-line/50 px-3 py-3 text-left transition-colors hover:bg-raised ${l.id === selecionadoId ? 'bg-raised' : ''}`}
              >
                <Avatar nome={l.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-text">{l.nome}</p>
                  <p className="truncate text-[11px] text-text-faint">{funilDoLead(funis, l.status).rotulo}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ---- meio: thread da conversa ---- */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg">
        {!leadSelecionado ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-text-faint">Selecione um lead à esquerda pra ver a conversa.</div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-line bg-panel px-4 py-3">
              <Avatar nome={leadSelecionado.nome} />
              <div className="min-w-0">
                <strong className="block truncate text-sm text-text">{leadSelecionado.nome}</strong>
                <span className="text-[11.5px] text-text-faint">{leadSelecionado.telefone || 'sem telefone cadastrado'}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {carregando ? (
                <SkeletonLinhas />
              ) : interacoes.length === 0 ? (
                <EstadoVazio Icone={Send} titulo="Nenhuma conversa registrada" descricao={`Registre o primeiro contato com ${leadSelecionado.nome} abaixo.`} />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {[...interacoes].reverse().map((i) => (
                    <div key={i.id} className="max-w-[80%] self-end rounded-lg rounded-tr-sm bg-people px-3 py-2 text-accent-ink shadow-sm">
                      <p className="mb-1 text-[9.5px] font-bold uppercase tracking-wide opacity-70">{TIPO_INTERACAO_ROTULO[i.tipo]}</p>
                      <p className="whitespace-pre-wrap text-[13px] leading-snug">{i.conteudo}</p>
                      <p className="mt-1 text-right text-[10px] opacity-70">{formatarData(i.criado_em)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-end gap-2 border-t border-line bg-panel p-3">
              <div className="w-fit">
                <Select categoria="pessoas" value={tipo} onChange={(e) => setTipo(e.target.value as TipoInteracao)} className="py-2.5 text-[12px]">
                  {(Object.keys(TIPO_INTERACAO_ROTULO) as TipoInteracao[])
                    .filter((t) => t !== 'mensagem_whatsapp')
                    .map((t) => (
                      <option key={t} value={t}>
                        {TIPO_INTERACAO_ROTULO[t]}
                      </option>
                    ))}
                </Select>
              </div>
              <input
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    aoEnviar();
                  }
                }}
                placeholder="Registrar ligação, reunião, nota…"
                className="flex-1 rounded-full border border-line bg-input px-4 py-2.5 text-sm text-text outline-none focus:border-people"
              />
              <button
                type="button"
                onClick={aoEnviar}
                disabled={enviando || !conteudo.trim()}
                className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink hover:bg-accent-strong disabled:opacity-50"
              >
                <Send className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ---- direita: dados do cliente ---- */}
      {leadSelecionado && (
        <div className="hidden flex-col overflow-y-auto border-l border-line bg-panel p-4 lg:flex">
          <div className="mb-4 flex flex-col items-center gap-2 text-center">
            <Avatar nome={leadSelecionado.nome} tamanho="lg" />
            <strong className="text-text">{leadSelecionado.nome}</strong>
            <Badge tom={funilDoLead(funis, leadSelecionado.status).tom} texto={funilDoLead(funis, leadSelecionado.status).rotulo} />
          </div>
          <div className="flex flex-col gap-2.5 text-[12.5px]">
            <div className="flex justify-between gap-2 border-b border-line pb-2">
              <span className="text-text-faint">Telefone</span>
              <span className="text-text">{leadSelecionado.telefone || '—'}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-line pb-2">
              <span className="text-text-faint">E-mail</span>
              <span className="truncate text-text">{leadSelecionado.email || '—'}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-line pb-2">
              <span className="text-text-faint">Origem</span>
              <span className="text-text">{leadSelecionado.origem || '—'}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-line pb-2">
              <span className="text-text-faint">Valor estimado</span>
              <span className="font-mono text-text">{leadSelecionado.valor_estimado != null ? formatarMoeda(leadSelecionado.valor_estimado) : '—'}</span>
            </div>
            {leadSelecionado.observacoes && (
              <div className="border-b border-line pb-2">
                <span className="mb-1 block text-text-faint">Observações</span>
                <p className="text-text-dim">{leadSelecionado.observacoes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
