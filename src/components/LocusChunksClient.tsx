"use client";

import Link from "next/link";
import { Id } from "@convex/_generated/dataModel";
import SavedChunkDisplay from "@/components/SavedChunkDisplay";
import TagManager from "@/components/TagManager";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@clerk/nextjs";

export default function LocusChunksClient({
  nexusId,
  locusId,
  scrollTo,
  tagId,
}: {
  nexusId: Id<"nexi">;
  locusId: Id<"notebooks">;
  scrollTo: Id<"chunks"> | null;
  tagId: Id<"tags"> | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"read" | "edit">("read");
  const { userId, isLoaded } = useAuth();
  const notebook = useQuery(
    api.queries.getNotebookById,
    isLoaded ? ({ notebookId: locusId } as { notebookId: Id<"notebooks"> }) : "skip"
  );
  const displayTitle = ((notebook as { name?: string } | null | undefined)?.name?.trim?.() || "Locus");
  const [anchorChunkId, setAnchorChunkId] = useState<Id<"chunks"> | null>(null);
  const [scrollTarget, setScrollTarget] = useState<Id<"chunks"> | null>(scrollTo);
  const PAGE_SIZE = 3;
  const [forceReadPage, setForceReadPage] = useState<number | null>(null);
  const [preferLastPage, setPreferLastPage] = useState<boolean>(false);
  const anchorIndexNotebook = useQuery(
    api.queries.getChunkIndexInNotebook,
    userId && anchorChunkId && !tagId ? { notebookId: locusId, chunkId: anchorChunkId, ownerId: userId } : "skip"
  ) as number | undefined;
  const anchorIndexTag = useQuery(
    api.queries.getChunkIndexInTag,
    userId && anchorChunkId && tagId ? { tagId, chunkId: anchorChunkId, ownerId: userId } : "skip"
  ) as number | undefined;

  return (
    <main className="flex-1 flex flex-col h-full">
      <header className="flex items-center justify-between px-4 h-12 border-b border-gray-700 flex-shrink-0 relative z-20">
        <nav className="flex items-center gap-3">
          <Link href={`/nexi/${nexusId}`} className="text-gray-400 hover:text-white" aria-label="Back to nexus">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{displayTitle}</h1>
          </div>
        </nav>
        <menu className="flex items-center gap-2">
          <button
            onClick={() => setIsTagManagerOpen(true)}
            className="px-4 py-2 rounded-lg bg-gradient-to-br from-green-400 via-emerald-400 to-green-500 hover:from-green-500 hover:via-emerald-500 hover:to-green-600 text-white shadow-sm"
            title="Manage all tags"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>Tags</span>
            </span>
          </button>
          <button
            onClick={() => {
              if (anchorChunkId) setScrollTarget(anchorChunkId);
              setViewMode(prev => {
                const next = prev === "read" ? "edit" : "read";
                if (next === "read") {
                  const idx = (tagId ? anchorIndexTag : anchorIndexNotebook);
                  if (typeof idx === 'number' && idx >= 0) {
                    const page = Math.floor(idx / PAGE_SIZE) + 1;
                    setForceReadPage(page);
                  } else {
                    // fallback: do not force; let child resolve from scrollToChunkId or remain on current
                    setForceReadPage(null);
                    setPreferLastPage(false);
                  }
                }
                return next;
              });
            }}
            className={`px-4 py-2 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black shadow-sm`}
            title="Toggle read/edit mode"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span className="font-medium">{viewMode === "read" ? "Edit" : "Read"}</span>
            </span>
          </button>
          <button
            onClick={() => startTransition(() => router.push(`/nexi/${nexusId}/loci/${locusId}/conversations`))}
            disabled={isPending}
            className={`px-4 py-2 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 hover:from-blue-500 hover:to-cyan-600 text-white shadow-sm ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isPending ? (
              "Loading..."
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 8c0-2.21-1.79-4-4-4H8C5.79 4 4 5.79 4 8v5c0 2.21 1.79 4 4 4h5l4 4v-4c2.21 0 4-1.79 4-4V8z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 13h5" />
                </svg>
                <span>History</span>
              </span>
            )}
          </button>
          <button
            onClick={() => startTransition(() => router.push(`/nexi/${nexusId}/loci/${locusId}/chat`))}
            disabled={isPending}
            className={`bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isPending ? (
              "Loading..."
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
                  <circle cx="10" cy="10" r="7" strokeWidth={2} />
                </svg>
                <span>Research</span>
              </span>
            )}
          </button>
        </menu>
      </header>

      {/* Context header rendered on the server page as an RSC */}

      <section className="flex-1 p-8 overflow-y-auto min-h-0 pb-24" data-scroll-container="true" aria-label="Content area">
        <div className="max-w-4xl mx-auto">
          <SavedChunkDisplay
            notebookId={locusId}
            nexusId={nexusId}
            selectedTagId={tagId}
            scrollToChunkId={scrollTarget}
            onScrollToChunkComplete={() => {
              setScrollTarget(null);
              router.replace(`/nexi/${nexusId}/loci/${locusId}${tagId ? `?tagId=${tagId}` : ""}`);
            }}
            viewMode={viewMode}
            onAnchorChange={(id) => setAnchorChunkId(id)}
            forcePage={viewMode === "read" ? forceReadPage : null}
            onForcePageApplied={() => setForceReadPage(null)}
            preferLastPage={viewMode === "read" ? preferLastPage : false}
            onPreferLastPageApplied={() => setPreferLastPage(false)}
          />
        </div>
      </section>
      <TagManager isOpen={isTagManagerOpen} onClose={() => setIsTagManagerOpen(false)} />
    </main>
  );
}


