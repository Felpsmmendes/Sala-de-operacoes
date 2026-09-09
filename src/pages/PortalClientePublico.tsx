import { CheckCircle2, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { diasAteEvento } from '../lib/api/contratos';
import { aprovarMoldura, aprovarVideo, assinarHomologacao, buscarPortalPorToken } from '../lib/api/portalCliente';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarData } from '../lib/status';
import { useConfirmDialog } from '../lib/useConfirmDialog';
import type { PortalPublico } from '../lib/types';

/**
 * Página PÚBLICA — o noivo/contratante acessa por link único (token do
 * contrato), sem criar conta nem logar. Trava D-15: 15 dias antes do
 * evento, a tela vira só-leitura (calculado a partir da data do evento,
 * nunca gravado). Ver README "Acesso da equipe e do cliente".
 */
export default function PortalClientePublico() {
  const { token } = useParams();
  const [portal, setPortal] = useState<PortalPublico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const confirmar = useConfirmDialog();

  async function carregar() {
    if (!token) return;
    setCarregando(true);
    setErro(null);
    try {
      setPortal(await buscarPortalPorToken(token));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [token]);

  const travado = portal ? diasAteEvento(portal.data_evento) < 15 : false;

  async function aoAprovarMoldura() {
    if (!token) return;
    setProcessando(true);
    try {
      await aprovarMoldura(token);
      await carregar();
    } catch (e) {
      window.alert(mensagemDeErro(e));
    } finally {
      setProcessando(false);
    }
  }

  async function aoAprovarVideo() {
    if (!token) return;
    setProcessando(true);
    try {
      await aprovarVideo(token);
      await carregar();
    } catch (e) {
      window.alert(mensagemDeErro(e));
    } finally {
      setProcessando(false);
    }
  }

  /** Achado da auditoria de UX (2026-09-06): antes disso, o botão "Assinar
      e confirmar homologação" já gravava direto, num único clique, sem
      nenhuma tela de revisão — a ação mais irreversível do produto,
      executada por alguém sem login, no celular. Agora um passo de
      confirmação (com resumo do que está sendo homologado) precisa ser
      aceito antes da gravação de verdade. */
  async function aoClicarAssinar() {
    if (!nome || !cpf || travado) return;
    const confirmado = await confirmar.pedir({
      titulo: 'Confirmar assinatura de homologação',
      mensagem: (
        <div className="flex flex-col gap-2">
          <p>Confira os dados antes de assinar — depois de confirmado, isso não pode ser desfeito por aqui.</p>
          <ul className="flex flex-col gap-1 rounded-sm border border-line bg-input px-3 py-2 text-text">
            <li>Moldura fotográfica: <strong>aprovada ✓</strong></li>
            <li>Vídeo: <strong>aprovado ✓</strong></li>
            <li>Nome: <strong>{nome}</strong></li>
            <li>CPF: <strong>{cpf}</strong></li>
          </ul>
        </div>
      ),
      textoConfirmar: 'Confirmar assinatura',
    });
    if (confirmado) await aoAssinar();
  }

  async function aoAssinar() {
    if (!token || !portal || !nome || !cpf) return;
    setProcessando(true);
    try {
      await assinarHomologacao(token, portal, nome, cpf);
      await carregar();
    } catch (e) {
      window.alert(mensagemDeErro(e));
    } finally {
      setProcessando(false);
    }
  }

  const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-neutral';

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-lg rounded-lg border border-line bg-panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-sm bg-gradient-to-br from-accent-strong to-accent text-[10px] font-bold text-accent-ink"
            style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35), 0 2px 6px -1px rgba(0,0,0,0.4)' }}
          >
            EC
          </span>
          <p className="text-sm font-semibold text-text">Portal do Cliente — Em Cena Eventos</p>
        </div>

        {carregando ? (
          <p className="text-sm text-text-dim">Carregando…</p>
        ) : erro ? (
          <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>
        ) : !portal ? (
          <p className="text-sm text-text-dim">Link inválido — verifique com a Em Cena Eventos.</p>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[13px] text-text">
                Olá, <strong>{portal.lead_nome}</strong>! Aqui você acompanha e aprova os detalhes do seu evento.
              </p>
              <p className="mt-1 text-[12.5px] text-text-dim">
                {formatarData(portal.data_evento)} · {portal.local || 'local a confirmar'}
              </p>
            </div>

            {travado && !portal.assinatura_em && (
              <p className="flex items-center gap-2 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
                <Lock className="h-4 w-4 flex-shrink-0" /> O prazo pra alterações (15 dias antes do evento) já passou — fale direto com a Em Cena Eventos pra qualquer ajuste.
              </p>
            )}

            {portal.assinatura_em ? (
              <div className="rounded-sm border border-success/30 bg-success/10 px-3 py-3 text-[13px] text-success">
                <p className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> Homologação confirmada!
                </p>
                <p className="mt-1 text-text-dim">
                  Assinado por {portal.assinatura_nome} em {formatarData(portal.assinatura_em)}. Qualquer dúvida, chama a gente.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-sm border border-line bg-input p-3">
                  <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Moldura fotográfica proposta</p>
                  {portal.moldura_arquivo_url ? (
                    <a href={portal.moldura_arquivo_url} target="_blank" rel="noreferrer" className="mb-2 block text-[12.5px] text-pending underline">
                      Ver moldura proposta
                    </a>
                  ) : (
                    <p className="mb-2 text-[12.5px] text-text-dim">Ainda não recebemos a moldura pra você aprovar.</p>
                  )}
                  <button
                    type="button"
                    disabled={!portal.moldura_arquivo_url || portal.moldura_aprovada || travado || processando}
                    onClick={aoAprovarMoldura}
                    className="rounded-sm bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
                  >
                    {portal.moldura_aprovada ? 'Moldura aprovada ✓' : 'Aprovar moldura'}
                  </button>
                </div>

                <div className="rounded-sm border border-line bg-input p-3">
                  <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Vídeo proposto</p>
                  {portal.video_arquivo_url ? (
                    <a href={portal.video_arquivo_url} target="_blank" rel="noreferrer" className="mb-2 block text-[12.5px] text-pending underline">
                      Ver vídeo proposto
                    </a>
                  ) : (
                    <p className="mb-2 text-[12.5px] text-text-dim">Ainda não recebemos o vídeo pra você aprovar.</p>
                  )}
                  <button
                    type="button"
                    disabled={!portal.video_arquivo_url || portal.video_aprovado || travado || processando}
                    onClick={aoAprovarVideo}
                    className="rounded-sm bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
                  >
                    {portal.video_aprovado ? 'Vídeo aprovado ✓' : 'Aprovar vídeo'}
                  </button>
                </div>

                <p className="text-[11.5px] text-text-faint">Seleção de coquetéis autorais: em breve por aqui.</p>

                <div className="rounded-sm border border-line bg-input p-3">
                  <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Assinatura de homologação</p>
                  {!portal.moldura_aprovada || !portal.video_aprovado ? (
                    <p className="text-[12.5px] text-text-dim">Aprove a moldura e o vídeo acima pra liberar a assinatura.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input className={campo} placeholder="Seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} disabled={travado} />
                      <input className={campo} placeholder="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} disabled={travado} />
                      <button type="button" disabled={!nome || !cpf || travado || processando} onClick={aoClicarAssinar} className="rounded-sm bg-accent px-3 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                        {processando ? 'Enviando…' : 'Assinar e confirmar homologação'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {confirmar.dialogo}
    </div>
  );
}
