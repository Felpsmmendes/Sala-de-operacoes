import { CalendarCheck2, CheckCircle2, MapPin, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { buscarConfirmacaoPorToken, responderConfirmacao } from '../lib/api/confirmacaoEscala';
import { SkeletonLinhas } from '../components/Skeleton';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { FUNCAO_EQUIPE_ROTULO, formatarData, formatarMoeda } from '../lib/status';
import type { ConfirmacaoEscala } from '../lib/types';

/**
 * Página PÚBLICA — sem login (pedido do usuário, 2026-09-14). O
 * freelancer recebe um link único (token da própria linha de escala,
 * gerado sozinho na convocação — 1 por pessoa por contrato/evento, ver
 * migration_032) e confirma ou recusa a própria presença direto por
 * aqui, sem precisar responder por fora e esperar o gestor atualizar a
 * mão. Mesmo padrão do Portal do Cliente/Ponto: RPC `security definer`
 * filtrando só pelo token, nunca lista geral.
 */
export default function ConfirmarEscala() {
  const { token } = useParams();
  const [dados, setDados] = useState<ConfirmacaoEscala | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [respondendo, setRespondendo] = useState<'confirmar' | 'recusar' | null>(null);

  async function carregar() {
    if (!token) return;
    setCarregando(true);
    setErro(null);
    try {
      setDados(await buscarConfirmacaoPorToken(token));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [token]);

  async function aoResponder(confirmar: boolean) {
    if (!token) return;
    setRespondendo(confirmar ? 'confirmar' : 'recusar');
    try {
      await responderConfirmacao(token, confirmar);
      await carregar();
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setRespondendo(null);
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
          <p className="text-sm font-semibold text-text">Confirmação de presença</p>
        </div>

        {carregando ? (
          <SkeletonLinhas />
        ) : erro ? (
          <p className="mt-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>
        ) : !dados ? (
          <p className="mt-4 text-sm text-text-dim">Link inválido — verifique se o link está certo ou peça outro pra Em Cena.</p>
        ) : dados.status === 'confirmado' ? (
          <TelaResultado
            Icone={CheckCircle2}
            tom="success"
            titulo="Presença confirmada!"
            desc={`Te esperamos dia ${formatarData(dados.data_evento)}${dados.hora_inicio ? `, ${dados.hora_inicio.slice(0, 5)}` : ''}.`}
            onDesfazer={() => aoResponder(false)}
            textoDesfazer="Na verdade, não vou poder"
            desfazendoAtivo={respondendo === 'recusar'}
          />
        ) : dados.status === 'recusado' ? (
          <TelaResultado
            Icone={XCircle}
            tom="danger"
            titulo="Você marcou que não vai poder"
            desc="Sem problema — se mudar de ideia, é só voltar aqui e confirmar."
            onDesfazer={() => aoResponder(true)}
            textoDesfazer="Mudei de ideia, posso confirmar"
            desfazendoAtivo={respondendo === 'confirmar'}
          />
        ) : (
          <>
            <p className="mb-4 text-[13px] text-text-dim">
              Oi, <strong className="text-text">{dados.membro_nome}</strong>! Você foi convocado(a) como{' '}
              <strong className="text-text">{FUNCAO_EQUIPE_ROTULO[dados.membro_funcao] ?? dados.membro_funcao}</strong> pro evento de{' '}
              <strong className="text-text">{dados.cliente_nome}</strong>.
            </p>

            <div className="mb-4 flex flex-col gap-2 rounded-sm border border-line bg-input p-3 text-[13px]">
              <span className="flex items-center gap-2 text-text">
                <CalendarCheck2 className="h-3.5 w-3.5 flex-shrink-0 text-people" strokeWidth={2} />
                {formatarData(dados.data_evento)}
                {dados.hora_inicio ? ` · ${dados.hora_inicio.slice(0, 5)}` : ''}
              </span>
              {dados.local && (
                <span className="flex items-center gap-2 text-text-dim">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-text-faint" strokeWidth={2} />
                  {dados.local}
                </span>
              )}
              <span className="mt-1 font-mono text-[13px] text-text">Diária: {formatarMoeda(dados.diaria)}</span>
            </div>

            <p className="mb-3 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Você pode confirmar presença?</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!!respondendo}
                onClick={() => aoResponder(true)}
                className="flex-1 rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
              >
                {respondendo === 'confirmar' ? 'Confirmando…' : 'Confirmar presença'}
              </button>
              <button
                type="button"
                disabled={!!respondendo}
                onClick={() => aoResponder(false)}
                className="flex-1 rounded-sm border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger/20 disabled:opacity-50"
              >
                {respondendo === 'recusar' ? 'Enviando…' : 'Não vou poder'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TelaResultado({
  Icone,
  tom,
  titulo,
  desc,
  onDesfazer,
  textoDesfazer,
  desfazendoAtivo,
}: {
  Icone: typeof CheckCircle2;
  tom: 'success' | 'danger';
  titulo: string;
  desc: string;
  onDesfazer: () => void;
  textoDesfazer: string;
  desfazendoAtivo: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className={`flex h-16 w-16 items-center justify-center rounded-full border ${tom === 'success' ? 'border-success/30 bg-success/10' : 'border-danger/30 bg-danger/10'}`}>
        <Icone className={`h-8 w-8 ${tom === 'success' ? 'text-success' : 'text-danger'}`} strokeWidth={2} />
      </div>
      <div>
        <p className="text-lg font-bold text-text">{titulo}</p>
        <p className="mt-1 text-[13px] text-text-dim">{desc}</p>
      </div>
      <button type="button" disabled={desfazendoAtivo} onClick={onDesfazer} className="mt-2 rounded-sm border border-line px-4 py-2 text-[12.5px] text-text-dim hover:bg-raised hover:text-text disabled:opacity-50">
        {desfazendoAtivo ? 'Enviando…' : textoDesfazer}
      </button>
    </div>
  );
}
