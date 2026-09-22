import { AlertTriangle, CheckCircle2, Copy, ExternalLink, MessageSquareText, RefreshCw, Smartphone, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { conectarWhatsapp, desconectarWhatsapp, salvarConfigWebhook, verificarStatusWhatsapp, type StatusWhatsapp } from '../../lib/api/whatsapp';
import { mensagemDeErro } from '../../lib/erroAmigavel';
import { toast } from '../../lib/toast';
import { useConfirmDialog } from '../../lib/useConfirmDialog';
import { SkeletonLinhas } from '../Skeleton';
import { Input } from '../ui/Input';

const QUALIDADE_ROTULO: Record<string, string> = { GREEN: 'Boa', YELLOW: 'Média — atenção', RED: 'Baixa — risco de bloqueio', UNKNOWN: 'Ainda sem dado' };

/** Aba "Conectar WhatsApp" do CRM (pedido do usuário, 2026-09-14). Só a
    via OFICIAL (Meta Business Cloud API) — decisão explícita depois de
    eu explicar que a via "não oficial" (QR Code, tipo WhatsApp Web/
    Baileys) precisaria de um servidor Node ligado 24h fora do Supabase/
    Vercel, e viola os Termos de Serviço do WhatsApp (risco real de
    banimento do número da empresa).
    Conectar/desconectar de verdade pela tela (não só configuração via
    CLI) — pedido explícito do usuário pensando em trocar de número no
    futuro: grava em `integracao_whatsapp` (migration_031), nunca lê o
    token de volta (só Edge Function, com service role, lê pra mandar
    mensagem/checar status). */
export function ConectarWhatsapp() {
  const [status, setStatus] = useState<StatusWhatsapp | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [conectando, setConectando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [salvandoWebhook, setSalvandoWebhook] = useState(false);
  const confirmar = useConfirmDialog();

  const urlCallbackWebhook = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  function gerarVerifyToken() {
    setVerifyToken(crypto.randomUUID().replace(/-/g, ''));
  }

  function copiarCallbackUrl() {
    navigator.clipboard
      .writeText(urlCallbackWebhook)
      .then(() => toast.sucesso('URL copiada.'))
      .catch(() => toast.aviso('Não foi possível copiar automaticamente. URL: ' + urlCallbackWebhook));
  }

  async function aoSalvarWebhook() {
    if (!verifyToken.trim()) return;
    setSalvandoWebhook(true);
    try {
      await salvarConfigWebhook(verifyToken.trim(), appSecret.trim() || null);
      toast.sucesso('Configuração do webhook salva — agora cole a URL e o token no painel da Meta.');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setSalvandoWebhook(false);
    }
  }

  async function verificar() {
    setCarregando(true);
    setErro(null);
    try {
      setStatus(await verificarStatusWhatsapp());
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    verificar();
  }, []);

  async function aoConectar() {
    if (!phoneNumberId.trim() || !accessToken.trim()) return;
    setConectando(true);
    try {
      await conectarWhatsapp(phoneNumberId.trim(), accessToken.trim());
      setPhoneNumberId('');
      setAccessToken('');
      setMostrarForm(false);
      toast.sucesso('Credenciais salvas — verificando conexão…');
      await verificar();
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setConectando(false);
    }
  }

  async function aoDesconectar() {
    const ok = await confirmar.pedir({
      titulo: 'Desconectar WhatsApp',
      mensagem: 'As convocações de equipe e as automações do CRM que enviam WhatsApp param de funcionar até reconectar. Confirma?',
      textoConfirmar: 'Desconectar',
      perigo: true,
    });
    if (!ok) return;
    setDesconectando(true);
    try {
      await desconectarWhatsapp();
      toast.sucesso('WhatsApp desconectado.');
      await verificar();
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setDesconectando(false);
    }
  }

  const conectado = !!status?.configurado;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-line bg-raised p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
            <Smartphone className="h-3.5 w-3.5 text-people" strokeWidth={2} /> Conexão oficial (Meta Business Cloud API)
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={verificar} disabled={carregando} className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-text-dim hover:bg-panel hover:text-text disabled:opacity-50">
              <RefreshCw className={`h-3 w-3 ${carregando ? 'animate-spin' : ''}`} strokeWidth={2} /> Verificar novamente
            </button>
            {conectado && !mostrarForm && (
              <button type="button" onClick={() => setMostrarForm(true)} className="rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-text-dim hover:bg-panel hover:text-text">
                Trocar número
              </button>
            )}
            {conectado && (
              <button type="button" onClick={aoDesconectar} disabled={desconectando} className="rounded-sm border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-danger hover:bg-danger/20 disabled:opacity-50">
                {desconectando ? 'Desconectando…' : 'Desconectar'}
              </button>
            )}
          </div>
        </div>

        {carregando ? (
          <SkeletonLinhas linhas={2} />
        ) : erro ? (
          <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">{erro}</p>
        ) : status?.configurado && status.valido ? (
          <div className="rounded-sm border border-success/30 bg-success/10 px-3 py-3 text-[13px] text-success">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" strokeWidth={2} /> Conectado
            </p>
            <p className="mt-1 text-text-dim">
              Número <strong className="text-text">{status.numero ?? '—'}</strong>
              {status.nomeVerificado ? ` (${status.nomeVerificado})` : ''} · Qualidade: {QUALIDADE_ROTULO[status.qualidade ?? ''] ?? status.qualidade ?? '—'}
            </p>
          </div>
        ) : status?.configurado && !status.valido ? (
          <div className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-3 text-[13px] text-danger">
            <p className="flex items-center gap-2 font-semibold">
              <XCircle className="h-4 w-4 flex-shrink-0" strokeWidth={2} /> Conectado, mas não está funcionando
            </p>
            <p className="mt-1 text-text-dim">{status.erro ?? 'Token ou ID do número podem ter expirado ou sido revogados na Meta.'} Gere um token novo e "Trocar número" acima.</p>
          </div>
        ) : (
          <div className="rounded-sm border border-pending/30 bg-pending/10 px-3 py-3 text-[13px] text-pending">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" strokeWidth={2} /> Ainda não conectado
            </p>
            <p className="mt-1 text-text-dim">Sem credenciais configuradas — as ações de WhatsApp (convocação de equipe, automações do CRM) ficam indisponíveis até isso ser feito.</p>
          </div>
        )}

        {(mostrarForm || !conectado) && !carregando && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-line pt-3 sm:grid-cols-2">
            <Input rotulo="Phone Number ID" categoria="pessoas" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="Ex: 109876543210987" />
            <Input rotulo="Token de acesso" categoria="pessoas" type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Token permanente da Meta" />
            <div className="flex items-center gap-2 sm:col-span-2">
              <button type="button" disabled={conectando || !phoneNumberId.trim() || !accessToken.trim()} onClick={aoConectar} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                {conectando ? 'Conectando…' : conectado ? 'Salvar novo número' : 'Conectar'}
              </button>
              {mostrarForm && conectado && (
                <button type="button" onClick={() => setMostrarForm(false)} className="text-[12px] text-text-faint hover:text-text-dim">
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border border-line bg-raised p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
          <MessageSquareText className="h-3.5 w-3.5 text-people" strokeWidth={2} /> Receber mensagem do cliente (webhook)
        </p>
        <p className="mb-3 text-[12.5px] text-text-dim">
          Sem isso, o sistema só ENVIA mensagem — não existe jeito de saber o que o cliente respondeu (nem em "Conversas", nem nas automações do CRM). Preencha aqui, depois cole a URL e o token no painel da Meta (App &gt; WhatsApp &gt; Configuration &gt; Webhook).
        </p>
        <div className="mb-3 flex items-center gap-2 rounded-sm border border-line bg-input px-3 py-2">
          <code className="flex-1 truncate font-mono text-[11.5px] text-text">{urlCallbackWebhook}</code>
          <button type="button" onClick={copiarCallbackUrl} className="flex flex-shrink-0 items-center gap-1 text-[11px] font-medium text-text-dim hover:text-text">
            <Copy className="h-3.5 w-3.5" strokeWidth={2} /> Copiar
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input rotulo="Verify token" categoria="pessoas" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="Cole aqui ou gere um" />
            </div>
            <button type="button" onClick={gerarVerifyToken} title="Gerar um token aleatório" className="flex-shrink-0 rounded-sm border border-line px-2.5 py-2.5 text-[11.5px] text-text-dim hover:bg-panel hover:text-text">
              Gerar
            </button>
          </div>
          <Input rotulo="App Secret (opcional)" categoria="pessoas" type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} placeholder="Meta > Configurações básicas" dica="Sem isso, o webhook funciona, só sem checar assinatura de cada mensagem." />
          <div className="sm:col-span-2">
            <button type="button" disabled={salvandoWebhook || !verifyToken.trim()} onClick={aoSalvarWebhook} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
              {salvandoWebhook ? 'Salvando…' : 'Salvar configuração do webhook'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-line bg-raised p-4">
        <p className="mb-3 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Onde conseguir as credenciais</p>
        <ol className="flex flex-col gap-3 text-[13px] text-text-dim">
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-people/15 text-[11px] font-bold text-people">1</span>
            <span>
              Crie (ou acesse) um app no{' '}
              <a href="https://business.facebook.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-people underline hover:text-people/80">
                Meta Business Suite <ExternalLink className="h-3 w-3" strokeWidth={2} />
              </a>{' '}
              e ative o produto WhatsApp — verificação da empresa costuma levar de dias a semanas.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-people/15 text-[11px] font-bold text-people">2</span>
            <span>
              Aprove os templates de mensagem usados pelo sistema (categoria <em>Utility</em>, idioma <code className="rounded-sm bg-input px-1 py-0.5 font-mono text-[11.5px]">pt_BR</code>) — hoje: <code className="rounded-sm bg-input px-1 py-0.5 font-mono text-[11.5px]">convocacao_freelancer</code> e o(s) template(s) que você cadastrar nas automações do CRM.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-people/15 text-[11px] font-bold text-people">3</span>
            <span>
              Pegue o <strong className="text-text">token de acesso permanente</strong> e o <strong className="text-text">Phone Number ID</strong> no painel do app, e cole nos campos acima.
            </span>
          </li>
        </ol>
      </div>

      <p className="text-[11.5px] text-text-faint">
        A via "não oficial" (QR Code, tipo WhatsApp Web) não está aqui de propósito — precisaria de um servidor à parte ligado 24h (fora do Supabase/Vercel), além de violar os Termos de Serviço do WhatsApp — risco real de banimento do número. Avisa se quiser reconsiderar mesmo assim.
      </p>

      {confirmar.dialogo}
    </div>
  );
}
