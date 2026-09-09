/** Placeholder de carregamento (DESIGN.md > Motion, 2026-09-09) — brilho
    horizontal em loop via `.skeleton` (index.css), no formato/tamanho
    aproximado do conteúdo final, no lugar de qualquer "Carregando..." em
    texto puro pra conteúdo estruturado (métrica, lista, gráfico).
    `w`/`h` aceitam qualquer valor CSS de largura/altura (ex. "100%", "18px"). */
export function Skeleton({ w = '100%', h = '14px', className = '' }: { w?: string; h?: string; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ width: w, height: h }} />;
}
