import { Id } from "@convex/_generated/dataModel";
import LocusChunksClient from "@/components/LocusChunksClient";

export default async function LocusChunksPage({ params, searchParams }: { params: Promise<{ nexusId: string; locusId: string }>; searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const { nexusId: nx, locusId: lx } = await params;
  const sp = await searchParams;
  const nexusId = nx as unknown as Id<"nexi">;
  const locusId = lx as unknown as Id<"notebooks">;
  const scrollTo = (sp["scrollTo"] as string) || null;
  const tagId = (sp["tagId"] as string) || null;

  return (
    <div className="flex-1 flex flex-col h-full">
      <LocusChunksClient
        nexusId={nexusId}
        locusId={locusId}
        scrollTo={scrollTo as unknown as Id<"chunks"> | null}
        tagId={tagId as unknown as Id<"tags"> | null}
      />
    </div>
  );
}


