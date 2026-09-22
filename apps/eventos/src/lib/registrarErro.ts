import { supabase } from './supabase';
import type { OrigemErro } from './types';

/** Monitoramento próprio de erros (2026-09-19, ver migration_038) — grava em
    `erros_app`; a página /status lista. Nunca pode derrubar o app nem gerar
    erro novo: tudo aqui é fire-and-forget dentro de try/catch, e o próprio
    insert NÃO passa por `toast.erro` (senão uma falha do log logaria a si
    mesma em loop). */

const LIMITE_POR_SESSAO = 20;
const MAX_MENSAGEM = 1000;
const MAX_STACK = 4000;

/** Ruído que não é bug do app: o navegador reportando erro de outra origem
    sem detalhe, loop benigno de ResizeObserver e falha de rede pura (offline
    ou Supabase fora — onde o próprio log também falharia). */
const IGNORAR = [/ResizeObserver loop/i, /^Script error\.?$/i, /^(Failed to fetch|NetworkError.*|Load failed)$/i];

const jaRegistrados = new Set<string>();
let enviados = 0;

export function registrarErro({ origem, mensagem, stack }: { origem: OrigemErro; mensagem: string; stack?: string | null }): void {
  try {
    const msg = String(mensagem ?? '').trim().slice(0, MAX_MENSAGEM);
    if (!msg || IGNORAR.some((r) => r.test(msg))) return;

    // mesmo erro repetido na mesma sessão conta uma vez só (ex.: um efeito que
    // falha a cada render não pode inundar a tabela)
    const chave = `${origem}|${msg}`;
    if (jaRegistrados.has(chave) || enviados >= LIMITE_POR_SESSAO) return;
    jaRegistrados.add(chave);
    enviados++;

    void supabase
      .from('erros_app')
      .insert({
        origem,
        mensagem: msg,
        stack: stack ? String(stack).slice(0, MAX_STACK) : null,
        rota: globalThis.location?.pathname?.slice(0, 300) ?? null,
        user_agent: globalThis.navigator?.userAgent?.slice(0, 300) ?? null,
      })
      .then(
        () => {},
        () => {}
      );
  } catch {
    /* log nunca derruba o app */
  }
}

/** Erros que escapam de tudo: exceção solta na janela e promessa rejeitada
    sem `.catch`. Chamado uma vez em main.tsx. */
export function instalarCapturaDeErros(): void {
  window.addEventListener('error', (e) => {
    registrarErro({ origem: 'janela', mensagem: e.message, stack: e.error instanceof Error ? e.error.stack : null });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const motivo = e.reason;
    registrarErro({ origem: 'promessa', mensagem: motivo instanceof Error ? motivo.message : String(motivo), stack: motivo instanceof Error ? motivo.stack : null });
  });
}

/** Só pra teste — zera o estado de deduplicação/teto. */
export function _resetarRegistroDeErros(): void {
  jaRegistrados.clear();
  enviados = 0;
}
