export function SkeletonLinhas({ n = 4 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-raised" />
      ))}
    </div>
  );
}
