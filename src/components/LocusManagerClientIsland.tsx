"use client";

import LocusManager from "@/components/LocusManager";
import { Id } from "@convex/_generated/dataModel";
import { useRouter } from "next/navigation";

export default function LocusManagerClientIsland({ nexusId }: { nexusId: Id<"nexi"> }) {
  const router = useRouter();
  return (
    <LocusManager
      nexusId={nexusId}
      onLocusSelected={(locusId) => router.push(`/nexi/${nexusId}/loci/${locusId}`)}
    />
  );
}


