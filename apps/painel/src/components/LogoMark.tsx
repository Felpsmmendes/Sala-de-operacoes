/** Marca "Firme" — mesmo SVG de 4 quadrantes da landing page
    (apps/landing/index.html), copiado à mão de propósito (app
    separado, sem import cruzado). Âmbar + teal são as duas cores da
    marca; nunca usar outra combinação pra este ícone. */
export function LogoMark({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <span className="flex flex-shrink-0 items-center justify-center rounded-md bg-ink" style={{ width: tamanho, height: tamanho }}>
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width={tamanho * 0.57} height={tamanho * 0.57}>
        <rect x="2" y="2" width="5" height="5" rx="1.5" fill="#F59E0B" />
        <rect x="9" y="2" width="5" height="5" rx="1.5" fill="white" opacity="0.4" />
        <rect x="2" y="9" width="5" height="5" rx="1.5" fill="white" opacity="0.4" />
        <rect x="9" y="9" width="5" height="5" rx="1.5" fill="#2DD4BF" opacity="0.8" />
      </svg>
    </span>
  );
}
