import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo?: string;
}

export function Textarea({ rotulo, id, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {rotulo && (
        <label htmlFor={id} className="text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">
          {rotulo}
        </label>
      )}
      <textarea
        id={id}
        {...props}
        className={`min-h-[84px] w-full resize-y rounded-md border border-line bg-input px-3 py-2.5 text-sm leading-relaxed text-text outline-none transition-colors placeholder:text-text-faint focus:border-accent ${className}`}
      />
    </div>
  );
}
