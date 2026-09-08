import { CheckCircle2, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { buscarPresencaDoEvento, registrarChegada } from '../lib/api/ponto';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { FUNCAO_EQUIPE_ROTULO, formatarData } from '../lib/status';
import type { EscalaPresenca } from '../lib/types';

/**
 * Página PÚBLICA — sem login, sem PIN (decisão do usuário: ponto aqui não é
 * folha de pagamento nem geofence, é só visibilidade operacional de quem já
 * chegou no evento). Qualquer um com o link escolhe o próprio nome entre os
 * escalados e confirma a chegada. Ver README "Acesso da equipe e do cliente".
 */
export default function PontoPublico() {
  const { eventoId } = useParams();
  const [linhas, setLinhas] = useState<EscalaPresenca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState<string | null>(null);

  async function carregar() {
    if (!eventoId) return;
    setCarregando(true);
    setErro(null);
    try {
      setLinhas(await buscarPresencaDoEvento(eventoId));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [eventoId]);

  async function aoConfirmarChegada(membroId: string) {
    if (!eventoId) return;
    setRegistrando(membroId);
    try {
      await registrarChegada(eventoId, membroId);
      await carregar();
    } catch (e) {
      window.alert(mensagemDeErro(e));
    } finally {
      setRegistrando(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-6">
        <div className="mb-1 flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-sm bg-gradient-to-br from-accent-strong to-accent text-[10px] font-bold text-accent-ink"
            style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35), 0 2px 6px -1px rgba(0,0,0,0.4)' }}
          >
            EC
          </span>
          <p className="text-sm font-semibold text-text">Confirmação de chegada</p>
        </div>

        {carregando ? (
          <p className="mt-4 text-sm text-text-dim">Carregando…</p>
        ) : erro ? (
          <p className="mt-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>
        ) : linhas.length === 0 ? (
          <p className="mt-4 text-sm text-text-dim">Nenhum link válido — verifique se o link está certo ou peça outro pra Em Cena.</p>
        ) : (
          <>
            <p className="mb-4 text-[12.5px] text-text-dim">
              {formatarData(linhas[0].data_evento)} · {linhas[0].local || 'local não informado'}
            </p>
            <p className="mb-3 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Toque no seu nome pra confirmar chegada</p>
            <div className="flex flex-col gap-2">
              {linhas.map((l) => (
                <button
                  key={l.escala_id}
                  type="button"
                  disabled={!!l.chegada_em || registrando === l.membro_id}
                  onClick={() => aoConfirmarChegada(l.membro_id)}
                  className={`flex items-center justify-between gap-3 rounded-sm border px-3 py-2.5 text-left text-sm transition-colors ${
                    l.chegada_em ? 'border-success/30 bg-success/10' : 'border-line bg-input hover:bg-raised disabled:opacity-60'
                  }`}
                >
                  <span>
                    <strong className="text-text">{l.membro_nome}</strong>
                    <span className="ml-2 text-[11.5px] text-text-faint">{FUNCAO_EQUIPE_ROTULO[l.membro_funcao] ?? l.membro_funcao}</span>
                  </span>
                  {l.chegada_em ? (
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> chegou {new Date(l.chegada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11.5px] text-text-faint">
                      <Clock className="h-3.5 w-3.5" /> {registrando === l.membro_id ? 'registrando…' : 'confirmar'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
