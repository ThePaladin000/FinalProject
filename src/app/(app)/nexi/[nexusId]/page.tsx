import Link from "next/link";
import LocusManagerClientIsland from "@/components/LocusManagerClientIsland";
import { Id } from "@convex/_generated/dataModel";
import { fetchNexusHeader } from "@/server/data/nexus";

export default async function NexusPage({ params }: { params: Promise<{ nexusId: string }> }) {
  const { nexusId: nx } = await params;
  const nexusId = nx as unknown as Id<"nexi">;
  const header = await fetchNexusHeader(String(nexusId));
  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-12 border-b border-gray-700 flex-shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          <Link href="/nexi" className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h2 className="text-lg font-semibold">{header.nexus.name}</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto">
          <LocusManagerClientIsland nexusId={nexusId} />
        </div>
      </div>
    </div>
  );
}


