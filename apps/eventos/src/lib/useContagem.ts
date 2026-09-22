import { useEffect, useRef, useState } from 'react';

/** "Número contando" (DESIGN.md > Motion, 2026-09-09) — sobe de 0 até
    `alvo` numa animação curta via requestAnimationFrame, reservado só pro
    valor "herói" de cada tela (nunca toda métrica pequena, ver o
    Don't correspondente). Respeita `prefers-reduced-motion`: pula direto
    pro valor final sem animar. */
export function useContagem(alvo: number, duracaoMs = 1000): number {
  const [valor, setValor] = useState(0);
  const alvoRef = useRef(alvo);
  alvoRef.current = alvo;

  useEffect(() => {
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzido) {
      setValor(alvoRef.current);
      return;
    }
    const alvoFixo = alvoRef.current;
    const inicio = performance.now();
    let frame: number;
    function passo(agora: number) {
      const t = Math.min(1, (agora - inicio) / duracaoMs);
      // easeOutCubic — mesma sensação de "chega rápido e assenta" do
      // easing cubic-bezier(.22,1,.36,1) do resto do sistema, sem precisar
      // reimplementar uma curva bezier cúbica só pra isso em JS puro.
      const suavizado = 1 - Math.pow(1 - t, 3);
      setValor(Math.round(alvoFixo * suavizado));
      if (t < 1) frame = requestAnimationFrame(passo);
    }
    frame = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(frame);
  }, [alvo, duracaoMs]);

  return valor;
}
