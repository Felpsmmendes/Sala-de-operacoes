export function Checkbox({ rotulo, marcado, onMudar }: { rotulo: string; marcado: boolean; onMudar: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-text">
      <input type="checkbox" checked={marcado} onChange={(e) => onMudar(e.target.checked)} className="h-4 w-4 accent-accent" />
      {rotulo}
    </label>
  );
}
