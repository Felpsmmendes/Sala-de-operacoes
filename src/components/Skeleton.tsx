/** Placeholder de carregamento (DESIGN.md > Motion, 2026-09-09) — brilho
    horizontal em loop via `.skeleton` (index.css), no formato/tamanho
    aproximado do conteúdo final, no lugar de qualquer "Carregando..." em
    texto puro pra conteúdo estruturado (métrica, lista, gráfico).
    `w`/`h` aceitam qualquer valor CSS de largura/altura (ex. "100%", "18px"). */
export function Skeleton({ w = '100%', h = '14px', className = '' }: { w?: string; h?: string; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ width: w, height: h }} />;
}

const LARGURAS_LINHA = ['92%', '78%', '85%', '65%', '70%'];

/** Placeholder pra qualquer lista/tabela simples de texto (auditoria de
    design, 2026-09-13 — trocando os "Carregando…" em texto puro que
    ainda restavam pelo resto do sistema). `linhas` controla quantas
    barras aparecem; as larguras variam só pra não ficar um bloco sólido
    idêntico repetido. */
export function SkeletonLinhas({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="flex flex-col gap-3 py-1">
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton key={i} h="16px" w={LARGURAS_LINHA[i % LARGURAS_LINHA.length]} />
      ))}
    </div>
  );
}
