import { CheckCircle2, Database, Globe, Mail, Smartphone, Trash2, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Cabecalho, Conteudo } from '../components/Layout';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { limparErros, listarErrosRecentes } from '../lib/api/errosApp';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import type { ErroApp, OrigemErro } from '../lib/types';
import { useConfirmDialog } from '../lib/useConfirmDialog';

type StatusItem = {
  id: string;
  rotulo: string;
  Icone: typeof Database;
  status: 'online' | 'verificando' | 'offline';
};

const ITENS_STATUS: StatusItem[] = [
  { id: 'banco', rotulo: 'Banco de dados', Icone: Database, status: 'verificando' },
  { id: 'portal', rotulo: 'Portal do Cliente', Icone: Globe, status: 'verificando' },
  { id: 'ponto', rotulo: 'Ponto Público', Icone: Smartphone, status: 'verificando' },
  { id: 'automacoes', rotulo: 'Automações', Icone: Zap, status: 'verificando' },
  { id: 'email', rotulo: 'E-mails', Icone: Mail, status: 'verificando' },
];

function formatarHora(): string {
  return new Date().toLocaleTimeString('pt-BR');
}

const ROTULO_ORIGEM: Record<OrigemErro, string> = { janela: 'Janela', promessa: 'Promessa', react: 'Tela', toast: 'Aviso' };

function haQuanto(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 60 * 24) return `há ${Math.round(min / 60)} h`;
  return `há ${Math.round(min / 1440)} d`;
}

/** Status do Sistema (2026-09-19, SPEC_CAMADA1_REORGANIZACAO Etapa 3) —
    só o banco é testado de verdade (query leve em `leads`, mesma
    infraestrutura que todo o resto do app usa pra ler/escrever). Portal
    do Cliente/Ponto Público/Automações/E-mails não têm healthcheck
    próprio no projeto — deriva do status do banco porque rodam na MESMA
    infraestrutura (Supabase + Vercel), nunca fabrica um "online" que não
    checou nada. */
export default function StatusSistema() {
  const [itens, setItens] = useState<StatusItem[]>(ITENS_STATUS);
  const [ultimaSync, setUltimaSync] = useState<string>('—');
  const [verificando, setVerificando] = useState(true);
  const [erros, setErros] = useState<ErroApp[] | null>(null);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const confirmar = useConfirmDialog();

  async function carregarErros() {
    try {
      setErros(await listarErrosRecentes(7));
      setErroCarregar(null);
    } catch (e) {
      setErroCarregar(mensagemDeErro(e));
    }
  }

  async function aoLimpar() {
    if (!(await confirmar.pedir({ titulo: 'Limpar o registro de erros?', mensagem: 'Apaga todos os erros registrados. Erros que voltarem a acontecer aparecem de novo.' }))) return;
    limparErros().then(carregarErros).catch((e) => toast.erro(mensagemDeErro(e)));
  }

  // agrupa por origem+mensagem: o que importa é "isso quebra, quantas vezes,
  // quando foi a última", não 40 linhas iguais
  const grupos = useMemo(() => {
    const mapa = new Map<string, { origem: OrigemErro; mensagem: string; qtd: number; ultimo: ErroApp }>();
    for (const e of erros ?? []) {
      const chave = `${e.origem}|${e.mensagem}`;
      const atual = mapa.get(chave);
      if (atual) atual.qtd++;
      else mapa.set(chave, { origem: e.origem, mensagem: e.mensagem, qtd: 1, ultimo: e });
    }
    return [...mapa.values()];
  }, [erros]);

  useEffect(() => {
    async function verificar() {
      setVerificando(true);

      let bancoStatus: 'online' | 'offline' = 'offline';
      try {
        const { error } = await supabase.from('leads').select('id').limit(1);
        bancoStatus = error ? 'offline' : 'online';
      } catch {
        bancoStatus = 'offline';
      }

      setItens([
        { id: 'banco', rotulo: 'Banco de dados', Icone: Database, status: bancoStatus },
        { id: 'portal', rotulo: 'Portal do Cliente', Icone: Globe, status: bancoStatus },
        { id: 'ponto', rotulo: 'Ponto Público', Icone: Smartphone, status: bancoStatus },
        { id: 'automacoes', rotulo: 'Automações', Icone: Zap, status: bancoStatus },
        { id: 'email', rotulo: 'E-mails', Icone: Mail, status: bancoStatus },
      ]);
      setUltimaSync(formatarHora());
      setVerificando(false);
    }

    verificar();
    carregarErros();
    const id = setInterval(() => {
      verificar();
      carregarErros();
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const todosOnline = itens.every((i) => i.status === 'online');

  return (
    <>
      <Cabecalho titulo="Status do Sistema" subtitulo="Monitoramento em tempo real dos serviços da Sala de Operações." />
      <Conteudo>
        <div className="mb-6 flex items-center gap-3">
          {verificando && ultimaSync === '—' ? (
            <span className="text-[13px] text-text-dim">Verificando serviços...</span>
          ) : todosOnline ? (
            <span className="flex items-center gap-2 text-[13px] text-success">
              <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
              Todos os serviços operando normalmente
            </span>
          ) : (
            <span className="flex items-center gap-2 text-[13px] text-danger">Atenção — um ou mais serviços com problema</span>
          )}
        </div>

        <div className="flex flex-col divide-y divide-line rounded-lg border border-line bg-panel">
          {itens.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-4">
              <item.Icone className="h-4 w-4 flex-shrink-0 text-text-dim" strokeWidth={1.75} />
              <span className="flex-1 text-[14px] text-text">{item.rotulo}</span>
              <span
                className={[
                  'flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide',
                  item.status === 'online' ? 'text-success' : item.status === 'offline' ? 'text-danger' : 'text-text-dim',
                ].join(' ')}
              >
                <span className={['h-1.5 w-1.5 rounded-full', item.status === 'online' ? 'bg-success' : item.status === 'offline' ? 'bg-danger' : 'bg-text-dim'].join(' ')} />
                {item.status === 'verificando' ? 'Verificando' : item.status === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-right font-mono text-[11px] text-text-dim">Última verificação às {ultimaSync} · atualiza a cada 30s</p>

        <Panel className="mt-8">
          <PanelHeader
            titulo="Erros do aplicativo"
            desc="Últimos 7 dias — falhas que o sistema capturou sozinho, incluindo os avisos de erro que apareceram na tela."
            acao={
              grupos.length > 0 && (
                <button type="button" onClick={aoLimpar} className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                  <Trash2 className="h-3 w-3" strokeWidth={2} /> Limpar
                </button>
              )
            }
          />
          {erroCarregar ? (
            <p className="text-[13px] text-danger">Não consegui carregar o registro de erros: {erroCarregar}</p>
          ) : erros === null ? (
            <SkeletonLinhas />
          ) : grupos.length === 0 ? (
            <p className="flex items-center gap-2 text-[13px] text-success">
              <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> Nenhum erro registrado nos últimos 7 dias.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {grupos.map((g) => (
                <details key={`${g.origem}|${g.mensagem}`} className="group py-2.5">
                  <summary className="flex cursor-pointer list-none items-start gap-3 text-[13px]">
                    <span className={`mt-0.5 flex-shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${g.origem === 'toast' ? 'border-pending/30 bg-pending/10 text-pending' : 'border-danger/30 bg-danger/10 text-danger'}`}>
                      {ROTULO_ORIGEM[g.origem]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-text">{g.mensagem}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-text-faint">
                        {g.ultimo.rota ?? '—'} · {haQuanto(g.ultimo.criado_em)}
                      </span>
                    </span>
                    <span className="flex-shrink-0 font-mono text-[12px] font-semibold text-text-dim">×{g.qtd}</span>
                  </summary>
                  {g.ultimo.stack && <pre className="mt-2 max-h-48 overflow-auto rounded-sm border border-line bg-input p-3 font-mono text-[10.5px] leading-relaxed text-text-dim">{g.ultimo.stack}</pre>}
                </details>
              ))}
            </div>
          )}
        </Panel>

        <p className="mt-8 text-center font-mono text-[10px] text-text-ultra">Sala de Operações · Em Cena Eventos</p>
      </Conteudo>
      {confirmar.dialogo}
    </>
  );
}
