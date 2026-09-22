import { useId, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo?: string;
}

export function Select({ rotulo, id: idProp, className = '', children, ...props }: SelectProps) {
  const idAuto = useId();
  const id = idProp ?? idAuto;
  return (
    <div className="flex w-full flex-col gap-1.5">
      {rotulo && (
        <label htmlFor={id} className="text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">
          {rotulo}
        </label>
      )}
      <select id={id} {...props} className={`w-full rounded-md border border-line bg-input px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent ${className}`}>
        {children}
      </select>
    </div>
  );
}
