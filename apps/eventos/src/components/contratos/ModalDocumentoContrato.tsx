import { CheckCircle2, ClipboardCopy, Eye, FileText, Pencil, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { salvarDocumentoContrato } from '../../lib/api/contratos';
import { FORMA_PAGAMENTO_EXTENSO, ROTULO_VARIAVEL, TEMPLATES_CONTRATO, TIPO_CONTRATO_DESCRICAO, TIPO_CONTRATO_ROTULO, formatarDataExtenso, preencherTemplate, type VariaveisContrato } from '../../lib/contratoTemplates';
import { mensagemDeErro } from '../../lib/erroAmigavel';
import { formatarMoeda } from '../../lib/status';
import type { ContratoComLead, TipoContrato } from '../../lib/types';

type Etapa = 'escolher_tipo' | 'editar' | 'preview' | 'link_gerado';

/** Documento de contrato: escolhe template → edita o texto → pré-visualiza
    → salva e gera o link do Portal (pedido do usuário, 2026-09-13). O
    editor é um `contentEditable` NÃO controlado por React durante a
    digitação — só sincroniza com `textoEditor` (state) nas transições
    de etapa. Controlar via `dangerouslySetInnerHTML` a cada tecla é um
    bug clássico dessa combinação: o cursor pula pro início do texto a
    cada caractere digitado, porque o React reconcilia o HTML inteiro de
    novo a cada render. */
export function ModalDocumentoContrato({ contrato, portalToken, aoFechar, aoSalvo }: { contrato: ContratoComLead; portalToken: string | null; aoFechar: () => void; aoSalvo: () => void }) {
  const [etapa, setEtapa] = useState<Etapa>(contrato.documento_texto ? 'preview' : 'escolher_tipo');
  const [tipo, setTipo] = useState<TipoContrato | null>(contrato.tipo_contrato);
  const [textoEditor, setTextoEditor] = useState(contrato.documento_texto ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const vars: VariaveisContrato = {
    nome_cliente: contrato.lead?.nome ?? '—',
    data_evento: formatarDataExtenso(contrato.data_evento),
    local_evento: contrato.local ?? 'a confirmar',
    convidados: contrato.convidados != null ? String(contrato.convidados) : '—',
    valor_total: formatarMoeda(contrato.valor_total),
    valor_sinal: formatarMoeda(contrato.valor_sinal),
    valor_saldo: formatarMoeda(contrato.valor_saldo),
    forma_pagamento: contrato.forma_pagamento ? FORMA_PAGAMENTO_EXTENSO[contrato.forma_pagamento] : '—',
    data_hoje: formatarDataExtenso(new Date().toISOString()),
  };

  // Preenche o DOM a partir de `textoEditor` só ao ENTRAR na etapa
  // "editar" — não a cada render, senão perde a digitação em andamento.
  useEffect(() => {
    if (etapa === 'editar' && editorRef.current) editorRef.current.innerHTML = textoEditor;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa]);

  /** Sincroniza o DOM → state antes de sair do editor (preview, trocar
      tipo, salvar) — sem isso, voltar do preview pro editor perderia o
      que foi digitado, porque o efeito acima reescreveria o DOM a
      partir do state desatualizado. */
  function sairDoEditor(proxima: Etapa) {
    if (etapa === 'editar' && editorRef.current) setTextoEditor(editorRef.current.innerHTML);
    setEtapa(proxima);
  }

  function aoEscolherTipo(novoTipo: TipoContrato) {
    setTipo(novoTipo);
    setTextoEditor(preencherTemplate(TEMPLATES_CONTRATO[novoTipo], vars));
    setEtapa('editar');
  }

  function textoAtual(): string {
    return etapa === 'editar' && editorRef.current ? editorRef.current.innerHTML : textoEditor;
  }

  function formatar(cmd: string) {
    editorRef.current?.focus();
    document.execCommand(cmd);
  }

  function inserirVariavel(chave: string) {
    editorRef.current?.focus();
    document.execCommand('insertText', false, `{{${chave}}}`);
  }

  async function aoSalvar() {
    if (!tipo) return;
    setSalvando(true);
    setErro(null);
    try {
      const texto = textoAtual();
      setTextoEditor(texto);
      await salvarDocumentoContrato(contrato.id, tipo, texto);
      aoSalvo();
      setEtapa('link_gerado');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const linkPortal = portalToken ? `${window.location.origin}/portal/${portalToken}` : null;

  function copiarLink() {
    if (!linkPortal) return;
    navigator.clipboard.writeText(linkPortal).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={aoFechar}>
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-lg border border-line bg-panel"
        style={{ maxWidth: etapa === 'editar' || etapa === 'preview' ? 860 : 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-line px-6 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 flex-shrink-0 text-money" strokeWidth={2} />
            <strong className="truncate text-[15px] text-text">Documento do contrato — {contrato.lead?.nome ?? '—'}</strong>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {etapa === 'editar' && (
              <button type="button" onClick={() => sairDoEditor('preview')} className="flex items-center gap-1.5 rounded-sm border border-line bg-raised px-3 py-1.5 text-[11.5px] font-semibold text-text-dim hover:text-text">
                <Eye className="h-3.5 w-3.5" strokeWidth={2} /> Pré-visualizar
              </button>
            )}
            {etapa === 'preview' && (
              <button type="button" onClick={() => setEtapa('editar')} className="flex items-center gap-1.5 rounded-sm border border-line bg-raised px-3 py-1.5 text-[11.5px] font-semibold text-text-dim hover:text-text">
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Voltar a editar
              </button>
            )}
            <button type="button" onClick={aoFechar} className="text-text-faint hover:text-text">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {etapa === 'escolher_tipo' && (
            <div className="flex flex-col gap-3">
              <p className="text-[12.5px] text-text-dim">Escolha o tipo de contrato pra gerar o documento com as cláusulas certas — dá pra editar o texto livremente antes de enviar ao cliente.</p>
              {(Object.keys(TIPO_CONTRATO_ROTULO) as TipoContrato[]).map((t) => (
                <button key={t} type="button" onClick={() => aoEscolherTipo(t)} className="rounded-md border border-line bg-raised px-4 py-3.5 text-left transition-colors hover:border-money/40 hover:bg-money/10">
                  <strong className="block text-[13px] text-text">{TIPO_CONTRATO_ROTULO[t]}</strong>
                  <span className="text-[11.5px] text-text-faint">{TIPO_CONTRATO_DESCRICAO[t]}</span>
                </button>
              ))}
            </div>
          )}

          {etapa === 'editar' && (
            <div className="flex flex-col gap-3.5">
              <p className="rounded-sm border border-money/25 bg-money/10 px-3.5 py-2.5 text-[12px] text-money">
                O texto já veio preenchido com os dados do contrato. Edite livremente — o cliente só vê a versão final depois que você salvar e enviar o link.
              </p>

              <div className="flex flex-wrap gap-1.5 rounded-sm border border-line bg-raised p-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    formatar('bold');
                  }}
                  className="rounded-sm border border-line bg-input px-2.5 py-1 text-[12px] font-bold text-text-dim hover:text-text"
                >
                  B
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    formatar('italic');
                  }}
                  className="rounded-sm border border-line bg-input px-2.5 py-1 text-[12px] italic text-text-dim hover:text-text"
                >
                  I
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    formatar('underline');
                  }}
                  className="rounded-sm border border-line bg-input px-2.5 py-1 text-[12px] underline text-text-dim hover:text-text"
                >
                  S
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    formatar('insertUnorderedList');
                  }}
                  className="rounded-sm border border-line bg-input px-2.5 py-1 text-[12px] text-text-dim hover:text-text"
                >
                  • Lista
                </button>
              </div>

              <div ref={editorRef} contentEditable suppressContentEditableWarning className="doc-papel min-h-[380px] rounded-md border border-line bg-input px-5 py-4 text-[13px] leading-relaxed text-text outline-none focus:border-money/40" />

              <div className="rounded-sm border border-line bg-raised p-3.5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-faint">Variáveis disponíveis — clique pra inserir no cursor</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(vars) as (keyof VariaveisContrato)[]).map((chave) => (
                    <button
                      key={chave}
                      type="button"
                      onClick={() => inserirVariavel(chave)}
                      title={`${ROTULO_VARIAVEL[chave]} — valor atual: ${vars[chave]}`}
                      className="rounded-sm border border-money/25 bg-money/10 px-2 py-1 font-mono text-[10.5px] text-money hover:bg-money/20"
                    >
                      {`{{${chave}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {etapa === 'preview' && <div className="doc-papel rounded-md bg-white px-8 py-8 text-[13px] leading-relaxed text-[#1a1a1a]" dangerouslySetInnerHTML={{ __html: preencherTemplate(textoEditor, vars) }} />}

          {etapa === 'link_gerado' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-money/25 bg-money/10 text-money">
                <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[15px] font-bold text-text">Documento salvo</p>
                <p className="text-[12px] text-text-dim">Envie o link abaixo pro cliente ler e assinar o contrato.</p>
              </div>
              {linkPortal ? (
                <div className="flex w-full flex-col gap-2">
                  <div className="break-all rounded-sm border border-line bg-input px-3.5 py-2.5 text-left font-mono text-[12px] text-text-dim">{linkPortal}</div>
                  <button type="button" onClick={copiarLink} className="flex items-center justify-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink hover:bg-accent-strong">
                    <ClipboardCopy className="h-3.5 w-3.5" strokeWidth={2} /> {copiado ? 'Link copiado ✓' : 'Copiar link pra enviar ao cliente'}
                  </button>
                  <p className="text-[11px] text-text-ultra">Envie por WhatsApp, e-mail ou onde preferir — o cliente não precisa criar conta pra ler e assinar.</p>
                </div>
              ) : (
                <p className="text-[12px] text-danger">Portal do cliente não encontrado pra este contrato — confira na aba "Portal do Cliente".</p>
              )}
            </div>
          )}

          {erro && <p className="mt-3 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">{erro}</p>}
        </div>

        {(etapa === 'editar' || etapa === 'preview') && (
          <div className="flex flex-shrink-0 items-center justify-between border-t border-line px-6 py-3.5">
            <button type="button" onClick={() => sairDoEditor('escolher_tipo')} className="text-[12px] text-text-faint hover:text-text-dim">
              ← Trocar tipo de contrato
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={aoFechar} className="rounded-sm border border-line px-4 py-2 text-[12.5px] font-medium text-text-dim hover:bg-raised hover:text-text">
                Cancelar
              </button>
              <button type="button" disabled={salvando} onClick={aoSalvar} className="flex items-center gap-1.5 rounded-sm bg-accent px-4 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                <FileText className="h-3.5 w-3.5" strokeWidth={2} /> {salvando ? 'Salvando…' : 'Salvar e gerar link'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
