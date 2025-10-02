import { Id } from "@convex/_generated/dataModel";
import ChatPageClient from "@/components/ChatPageClient";

export default async function ChatPage({ params }: { params: Promise<{ nexusId: string; locusId: string }> }) {
  const { nexusId: nx, locusId: lx } = await params;
  const nexusId = nx as unknown as Id<"nexi">;
  const locusId = lx as unknown as Id<"notebooks">;
  return (
    <div className="flex-1 flex flex-col h-full">
      <ChatPageClient nexusId={nexusId} locusId={locusId} />
    </div>
  );
}


