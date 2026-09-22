import type { ButtonHTMLAttributes } from 'react';
import type { CategoriaMetrica } from './MetricCard';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'nucleus';
  /** só pra variant="nucleus" — decide a cor (mesmo mapa de núcleo do
      MetricCard/IconBox). Sem isso, cai em "neutro". */
  categoria?: CategoriaMetrica;
};

const COR_NUCLEO: Record<CategoriaMetrica, string> = {
  dinheiro: 'var(--color-money)',
  pessoas: 'var(--color-people)',
  agenda: 'var(--color-schedule)',
  operacao: 'var(--color-ops)',
  acao: 'var(--color-accent)',
  execucao: 'var(--color-execucao)',
  neutro: 'var(--color-neutral)',
};

/** Botão compartilhado (ver DESIGN.md "Components > Buttons") — o
    sistema não tinha um `Button` reutilizável até aqui, cada tela
    escrevia a classe do botão de ação primária/secundário na mão,
    repetida em cada arquivo. Este componente centraliza o visual do
    botão PRIMÁRIO: fundo sólido âmbar (cor de ação/marca — v2, 2026-09-10,
    trocou o gradiente+glow da v1 por um sólido simples, igual ao que
    todo botão inline do sistema já usa) + leve elevação no hover (prompt
    master, seção 6.1). O secundário/ghost continua sólido/bordado, sem
    tingir de âmbar, como já era.

    `ghost`/`danger`/`nucleus` (prompt master, seção 4.12) — completam o
    conjunto de variantes que faltava: `danger` reaproveita a mesma
    receita de cor já usada nos banners de erro e no ConfirmDialog
    (nunca preenchido sólido — ver DESIGN.md); `nucleus` é pra ação cuja
    cor deve seguir o núcleo do módulo (ex. "Ver logística" tingido de
    teal), diferente da ação de marca (`primary`, sempre âmbar).

    Os botões que cada tela já escreve inline (`className="rounded-sm
    bg-accent px-4 py-2.5 ..."`) continuam exatamente como estão —
    migrar cada tela pra usar este componente é trabalho de uma etapa
    futura, tela por tela. */
export function Button({ variant = 'primary', categoria = 'neutro', className = '', style, ...props }: ButtonProps) {
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

  if (variant === 'ghost') {
    return (
      <button
        type="button"
        className={`rounded-sm px-4 py-2.5 text-sm font-medium text-text-faint transition-colors hover:bg-raised hover:text-text-dim disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        style={style}
        {...props}
      />
    );
  }

  if (variant === 'danger') {
    return (
      <button
        type="button"
        className={`rounded-sm border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
        style={style}
        {...props}
      />
    );
  }

  if (variant === 'nucleus') {
    const cor = COR_NUCLEO[categoria];
    return (
      <button
        type="button"
        style={{ color: cor, border: `1px solid color-mix(in srgb, ${cor} 20%, transparent)`, background: `color-mix(in srgb, ${cor} 10%, transparent)`, ...style }}
        className={`rounded-sm px-4 py-2.5 text-sm font-semibold transition-[box-shadow] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
        {...props}
      />
    );
  }

  return (
    <button
      type="button"
      className={`rounded-sm bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition-[transform,box-shadow,background-color] hover:-translate-y-px hover:bg-accent-strong hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none ${className}`}
      style={style}
      {...props}
    />
  );
}
