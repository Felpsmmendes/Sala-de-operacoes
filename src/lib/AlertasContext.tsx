import { createContext, useContext, useState, type ReactNode } from 'react';

type AlertasContextType = { contagem: number; setContagem: (n: number) => void };

const AlertasContext = createContext<AlertasContextType>({ contagem: 0, setContagem: () => {} });

/** Contagem de "pontos de atenção" pro badge da sidebar (2026-09-16,
    "redesign visual" do usuário) — o Dashboard já calcula
    `pontosDeAtencao` (estoque crítico + contrato em risco + NPS baixo),
    mas ele é FILHO do `Layout` na árvore de componentes, não pai — não
    dá pra passar isso por prop direto. Contexto simples resolve sem
    precisar subir o estado pro Layout (que não tem, e não deveria ter,
    nenhuma lógica de negócio dessas). Só o Dashboard escreve; só a
    sidebar lê. */
export function AlertasProvider({ children }: { children: ReactNode }) {
  const [contagem, setContagem] = useState(0);
  return <AlertasContext.Provider value={{ contagem, setContagem }}>{children}</AlertasContext.Provider>;
}

export function useAlertas(): AlertasContextType {
  return useContext(AlertasContext);
}
