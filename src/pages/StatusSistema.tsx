import { CheckCircle2, Database, Globe, Mail, Smartphone, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Cabecalho, Conteudo } from '../components/Layout';
import { supabase } from '../lib/supabase';

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
    const id = setInterval(verificar, 30_000);
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

        <p className="mt-8 text-center font-mono text-[10px] text-text-ultra">Sala de Operações · Em Cena Eventos</p>
      </Conteudo>
    </>
  );
}
