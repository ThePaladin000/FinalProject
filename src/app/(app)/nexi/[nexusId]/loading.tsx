export default function Loading() {
  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-12 border-b border-gray-700 flex-shrink-0">
        <div className="h-5 w-48 bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="flex-1 p-8 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />)
          )}
        </div>
      </div>
    </div>
  );
}


