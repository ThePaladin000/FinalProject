import { Id } from "@convex/_generated/dataModel";
import { fetchNexusHeader } from "@/server/data/nexus";

interface NexusContextDisplayProps {
  nexusId: Id<"nexi">;
  notebookId?: Id<"notebooks">;
  className?: string;
}

export default async function NexusContextDisplay({
  nexusId,
  notebookId,
  className = "",
}: NexusContextDisplayProps) {
  const header = await fetchNexusHeader(String(nexusId), notebookId ? String(notebookId) : undefined);

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      {header.notebook ? (
        <div className="space-y-2 text-center">
          <h3 className="text-lg font-semibold text-white">{header.notebook.name}</h3>
          {header.notebook.metaQuestion && (
            <div className="text-sm text-gray-300">{header.notebook.metaQuestion}</div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-semibold text-white">{header.nexus.name}</h3>
          </div>
          {header.nexus.description && (
            <div className="text-sm text-gray-300">{header.nexus.description}</div>
          )}
        </div>
      )}
    </div>
  );
}