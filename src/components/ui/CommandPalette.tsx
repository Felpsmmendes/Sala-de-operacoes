import { ArrowDown, ArrowUp, CornerDownLeft, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ITENS_BUSCAVEIS } from '../Layout';

/** Busca global (Cmd/Ctrl+K) — pedido do usuário (checklist externo,
    2026-09-13), navega pros módulos da sidebar sem tirar a mão do
    teclado. Reaproveita `ITENS_BUSCAVEIS` (Layout.tsx) como fonte única
    das telas — nunca uma lista duplicada que desalinha da sidebar real.
    Montado 1x em Layout.tsx (só nas telas autenticadas, dentro do
    `<Outlet/>` protegido). */
export function CommandPalette() {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState(0);
  const navegar = useNavigate();

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAberto((atual) => !atual);
        setBusca('');
        setSelecionado(0);
      }
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return ITENS_BUSCAVEIS;
    return ITENS_BUSCAVEIS.filter((i) => i.rotulo.toLowerCase().includes(termo));
  }, [busca]);

  useEffect(() => setSelecionado(0), [busca]);

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') return setAberto(false);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelecionado((s) => Math.min(s + 1, filtrados.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelecionado((s) => Math.max(s - 1, 0));
      }
      if (e.key === 'Enter' && filtrados[selecionado]) {
        navegar(filtrados[selecionado].to);
        setAberto(false);
      }
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto, filtrados, selecionado, navegar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[14vh]" onClick={() => setAberto(false)}>
      <div className="w-full max-w-[560px] overflow-hidden rounded-lg border border-line bg-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 flex-shrink-0 text-text-faint" strokeWidth={2} />
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar módulo…"
            className="flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-text-faint"
          />
          <kbd className="flex-shrink-0 rounded-sm border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-text-faint">ESC</kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto py-1.5">
          {filtrados.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-text-dim">Nenhum módulo encontrado.</p>
          ) : (
            filtrados.map((item, i) => (
              <div
                key={item.to}
                onClick={() => {
                  navegar(item.to);
                  setAberto(false);
                }}
                onMouseEnter={() => setSelecionado(i)}
                className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 ${i === selecionado ? 'bg-accent/10' : 'hover:bg-raised'}`}
              >
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-icon border ${i === selecionado ? 'border-accent/25 bg-accent/10 text-accent' : 'border-line bg-raised text-text-faint'}`}>
                  <item.Icone className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
                <span className={`text-[13px] font-medium ${i === selecionado ? 'text-text' : 'text-text-dim'}`}>{item.rotulo}</span>
                {i === selecionado && (
                  <span className="ml-auto flex flex-shrink-0 items-center gap-1 font-mono text-[10px] text-text-faint">
                    <CornerDownLeft className="h-3 w-3" strokeWidth={2} /> abrir
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-line px-4 py-2">
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-faint">
            <ArrowUp className="h-3 w-3" strokeWidth={2} />
            <ArrowDown className="h-3 w-3" strokeWidth={2} /> navegar
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-faint">
            <CornerDownLeft className="h-3 w-3" strokeWidth={2} /> abrir
          </span>
        </div>
      </div>
    </div>
  );
}
