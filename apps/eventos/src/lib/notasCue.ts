/** Notas operacionais por evento (2026-09-18, REVIEW_DECISOES_V2 Parte
    9/16, P2 — "seção própria, não MetricCard") — guardadas no navegador
    (localStorage), não no banco: não existe coluna pra isso em `eventos`
    nem em `cue_sheet_itens`, e criar uma tabela nova só pra texto livre
    de bastidor foge do escopo de um ajuste visual. Mesma lógica de
    `dadosEmpresa`/`ConfigPix` — uma chave por evento, pra não misturar
    a nota de um evento com a de outro. */
const PREFIXO = 'emcena_notas_cue_';

export function carregarNotasCue(eventoId: string): string {
  try {
    return localStorage.getItem(PREFIXO + eventoId) ?? '';
  } catch {
    return '';
  }
}

export function salvarNotasCue(eventoId: string, texto: string): void {
  try {
    if (texto.trim()) localStorage.setItem(PREFIXO + eventoId, texto);
    else localStorage.removeItem(PREFIXO + eventoId);
  } catch {
    // localStorage indisponível (modo privado etc.) — nota só não persiste.
  }
}
