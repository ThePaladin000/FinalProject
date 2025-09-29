import Link from "next/link";
import { Id } from "@convex/_generated/dataModel";
import ConversationHistory from "@/components/ConversationHistory";
import TagManager from "@/components/TagManager";
import { Suspense } from "react";

export default async function ConversationsPage({ params }: { params: Promise<{ nexusId: string; locusId: string }> }) {
  const { nexusId, locusId } = await params;
  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-12 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/nexi/${nexusId}/loci/${locusId}`} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h2 className="text-lg font-semibold">Conversation History</h2>
          </div>
        </div>
        <div className="flex items-center gap-2" />
      </div>

      <div className="flex-1 p-8 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto">
          <Suspense>
            <ConversationHistory
              notebookId={locusId as unknown as Id<"notebooks">}
              onConversationSelect={() => {}}
              selectedConversationId={null}
              onLoadAnswer={(answer) => {
                if (typeof window !== "undefined") {
                  try {
                    sessionStorage.setItem("preservedAnswer", answer);
                  } catch {}
                  window.location.href = `/nexi/${nexusId}/loci/${locusId}/chat`;
                }
              }}
            />
          </Suspense>
        </div>
      </div>
      <TagManager isOpen={false} onClose={() => {}} />
    </div>
  );
}


