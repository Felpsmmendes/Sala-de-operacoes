import type { CategoriaMetrica } from '../MetricCard';

const COR_NUCLEO: Record<CategoriaMetrica, string> = {
  dinheiro: 'var(--color-money)',
  pessoas: 'var(--color-people)',
  agenda: 'var(--color-schedule)',
  operacao: 'var(--color-ops)',
  acao: 'var(--color-accent)',
  execucao: 'var(--color-execucao)',
  neutro: 'var(--color-neutral)',
};

/** Avatar de iniciais (2026-09-16, "redesign visual" do usuário) — o
    sistema não tem upload de foto (nunca teve, decisão de escopo), só
    isso: até 2 iniciais do nome, mesmo par cor-de-fundo-suave/cor-de-
    texto-direta já usado no `IconBox` dos MetricCards, na cor do núcleo
    da tela onde aparece (pessoas/dinheiro/etc.). */
export function Avatar({ nome, categoria = 'pessoas', tamanho = 32 }: { nome: string; categoria?: CategoriaMetrica; tamanho?: number }) {
  const cor = COR_NUCLEO[categoria];
  const iniciais =
    nome
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';

  return (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: tamanho,
        height: tamanho,
        fontSize: tamanho * 0.36,
        border: `1px solid color-mix(in srgb, ${cor} 25%, transparent)`,
        background: `color-mix(in srgb, ${cor} 15%, transparent)`,
        color: cor,
      }}
    >
      {iniciais}
    </span>
  );
}
