export default function Loading() {
  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-12 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-5 w-32 bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-28 bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
      <div className="px-4 pb-4 flex-shrink-0">
        <div className="h-14 bg-gray-800 rounded-lg animate-pulse" />
      </div>
      <div className="flex-1 p-8 overflow-y-auto min-h-0 pb-24">
        <div className="max-w-4xl mx-auto space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}


