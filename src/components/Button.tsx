import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

/** Botão compartilhado (2026-09-09, ver DESIGN.md "Components > Buttons")
    — NOVO componente: o sistema não tinha um `Button` reutilizável até
    aqui, cada tela escrevia a classe do botão de ação primária/
    secundário na mão, repetida em cada arquivo. Este componente
    centraliza o visual do botão PRIMÁRIO — gradiente + sombra colorida,
    o único, junto com MetricCard e a sidebar, que ganha esse tratamento
    ("The Glass-For-Emphasis Rule": tabela/formulário/lista/input nunca
    ganham vidro/gradiente). O secundário/ghost continua sólido, sem
    gradiente, como já era.

    Os botões que cada tela já escreve inline (`className="rounded-sm
    bg-accent px-4 py-2.5 ..."`) continuam exatamente como estão —
    migrar cada tela pra usar este componente é trabalho de uma etapa
    futura, tela por tela (pedido explícito do usuário: só camada
    visual, sem mexer em tela nenhuma que não foi chamada nesta rodada). */
export function Button({ variant = 'primary', className = '', style, ...props }: ButtonProps) {
  if (variant === 'secondary') {
    return (
      <button
        type="button"
        className={`rounded-sm border border-line px-4 py-2.5 text-sm font-medium text-text-dim transition-colors hover:bg-raised hover:text-text disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        style={style}
        {...props}
      />
    );
  }

  return (
    <button
      type="button"
      className={`rounded-md px-5 py-3 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        background: 'linear-gradient(135deg, var(--color-accent-strong), var(--color-accent))',
        boxShadow: '0 4px 16px color-mix(in srgb, var(--color-accent) var(--btn-shadow-op), transparent)',
        ...style,
      }}
      {...props}
    />
  );
}
