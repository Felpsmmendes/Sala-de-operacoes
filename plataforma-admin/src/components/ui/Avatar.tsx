export function Avatar({ nome, tamanho = 32 }: { nome: string; tamanho?: number }) {
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
      className="flex flex-shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/15 font-semibold text-accent"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.36 }}
    >
      {iniciais}
    </span>
  );
}
