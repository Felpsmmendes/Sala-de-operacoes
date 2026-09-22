export function SkeletonLinhas({ n = 4 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="skeleton h-10 rounded-md" style={{ width: ['100%', '92%', '84%', '96%'][i % 4] }} />
      ))}
    </div>
  );
}
