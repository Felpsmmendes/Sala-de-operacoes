/** Threshold de satisfação (2026-09-18, REVIEW_DECISOES_V2 Parte 14/16,
    P2 — "Alerta de satisfação: nota igual ou inferior a [4]. Gera
    alerta e follow-up automático.") — mesma lógica de config local do
    negócio (localStorage, não Supabase) de `dadosEmpresa`/ConfigPix.

    Só este threshold foi ligado no sistema de verdade: o outro campo do
    mockup ("Alerta de proximidade do evento — [20] dias") mapeia pro
    D-20 de quitação de saldo, que em Contratos.tsx está documentado
    como regra INVIOLÁVEL do PRD (não um alerta ajustável) — tornar essa
    janela configurável mudaria a regra de negócio de verdade em vários
    lugares (Contratos, Dashboard, Financeiro) sem pedido explícito
    disso, então não foi implementado; a UI oferece só o que realmente
    muda o comportamento do sistema. */
const CHAVE_ALERTA_SATISFACAO = 'emcena_alerta_satisfacao_nota';
const PADRAO_ALERTA_SATISFACAO = 4;

export function carregarAlertaSatisfacaoNota(): number {
  try {
    const bruto = localStorage.getItem(CHAVE_ALERTA_SATISFACAO);
    const n = bruto != null ? Number(bruto) : NaN;
    return Number.isFinite(n) && n >= 0 && n <= 10 ? n : PADRAO_ALERTA_SATISFACAO;
  } catch {
    return PADRAO_ALERTA_SATISFACAO;
  }
}

export function salvarAlertaSatisfacaoNota(nota: number): void {
  try {
    localStorage.setItem(CHAVE_ALERTA_SATISFACAO, String(nota));
  } catch {
    // localStorage indisponível — configuração só não persiste.
  }
}
