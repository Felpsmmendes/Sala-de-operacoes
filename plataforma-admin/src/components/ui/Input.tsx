import { useId, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo?: string;
  dica?: string;
}

export function Input({ rotulo, dica, id: idProp, className = '', ...props }: InputProps) {
  // sem `id`, gera um — senão o <label htmlFor> fica solto e não liga ao campo
  const idAuto = useId();
  const id = idProp ?? idAuto;
  return (
    <div className="flex w-full flex-col gap-1.5">
      {rotulo && (
        <label htmlFor={id} className="text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">
          {rotulo}
        </label>
      )}
      <input
        id={id}
        {...props}
        className={`w-full rounded-md border border-line bg-input px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-faint focus:border-accent ${className}`}
      />
      {dica && <span className="text-[11px] text-text-faint">{dica}</span>}
    </div>
  );
}
