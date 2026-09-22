import { useEffect, useRef, useState } from 'react';
import { reduzirMovimento } from '../hooks/useInView';

/** "Número contando": sobe de 0 até `alvo` numa animação curta (easeOutCubic) e
    termina EXATAMENTE em `alvo`. Devolve o valor cru (com casas decimais no
    meio do caminho) — quem chama formata (`formatarInteiro`, `formatarMoeda`…),
    porque arredondar aqui perderia os centavos do valor final. Reinicia quando
    `alvo` muda (ex.: o dado acabou de chegar do banco). Com
    `prefers-reduced-motion`, pula direto pro valor final. */
export function useContagem(alvo: number, duracaoMs = 1000): number {
  const [valor, setValor] = useState(() => (reduzirMovimento() ? alvo : 0));
  const alvoRef = useRef(alvo);
  alvoRef.current = alvo;

  useEffect(() => {
    if (reduzirMovimento()) {
      setValor(alvoRef.current);
      return;
    }
    const alvoFixo = alvoRef.current;
    const inicio = performance.now();
    let frame: number;
    function passo(agora: number) {
      const t = Math.min(1, (agora - inicio) / duracaoMs);
      setValor(t >= 1 ? alvoFixo : alvoFixo * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(passo);
    }
    frame = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(frame);
  }, [alvo, duracaoMs]);

  return valor;
}
