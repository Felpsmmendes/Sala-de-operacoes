import { GlassWater, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { contarDrinksDoEvento, registrarDrink } from '../lib/api/drinks';
import { mensagemDeErro } from '../lib/erroAmigavel';

/**
 * Página PÚBLICA — sem login, mesmo molde do Ponto Eletrônico público
 * (ver PontoPublico.tsx). Fase C do roadmap (2026-09-11): não é POS nem
 * substitui catálogo de receita — é só um contador de toques (1 drink
 * servido = 1 toque), pra dar ao gestor ritmo/total real durante o
 * evento, no lugar de um número inventado. Qualquer um com o link pode
 * tocar — mesma aceitação de risco do Ponto (não é dado financeiro nem
 * prova jurídica, é visibilidade operacional).
 *
 * "Desfazer" só existe nesta aba, enquanto ela está aberta (contador
 * local) — cada toque já virou uma linha no banco no mesmo instante, e
 * a tela pública não tem permissão de leitura/exclusão da tabela bruta
 * (só a contagem via RPC, ver migration_026). Se fechar a aba e reabrir,
 * o total volta a vir do banco — o desfazer não se aplica.
 */
export default function DrinksPublico() {
  const { eventoId } = useParams();
  const [total, setTotal] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [ultimoToqueLocal, setUltimoToqueLocal] = useState(false);

  async function carregar() {
    if (!eventoId) return;
    try {
      setTotal(await contarDrinksDoEvento(eventoId));
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  useEffect(() => {
    carregar();
  }, [eventoId]);

  async function aoTocar() {
    if (!eventoId || registrando) return;
    setRegistrando(true);
    setErro(null);
    try {
      await registrarDrink(eventoId);
      setTotal((atual) => (atual ?? 0) + 1);
      setUltimoToqueLocal(true);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-6 text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-sm bg-gradient-to-br from-accent-strong to-accent text-[10px] font-bold text-accent-ink"
            style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35), 0 2px 6px -1px rgba(0,0,0,0.4)' }}
          >
            EC
          </span>
          <p className="text-sm font-semibold text-text">Contador de Drinks</p>
        </div>

        {erro && <p className="mt-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        {!eventoId ? (
          <p className="mt-4 text-sm text-text-dim">Link inválido.</p>
        ) : (
          <>
            <p className="mb-6 mt-4 text-[12.5px] text-text-faint">Toque a cada drink servido nesse posto.</p>

            <button
              type="button"
              disabled={registrando}
              onClick={aoTocar}
              className="mx-auto flex h-40 w-40 flex-col items-center justify-center gap-1 rounded-full bg-ops text-accent-ink transition-transform active:scale-95 disabled:opacity-70"
            >
              <GlassWater className="h-8 w-8" strokeWidth={2} />
              <span className="font-mono text-4xl font-bold tabular-nums">{total ?? '—'}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide">{registrando ? 'registrando…' : 'toque pra +1'}</span>
            </button>

            {ultimoToqueLocal && (
              <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-text-faint">
                <Info className="h-3 w-3" strokeWidth={2} /> Tocou errado? Não tem desfazer — chama o gestor se precisar corrigir a contagem.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
