"use client";

import { usePathname, useRouter } from "next/navigation";
import TreeView from "@/components/TreeView";
import { Id } from "@convex/_generated/dataModel";

export default function SidebarTreeClient() {
  const pathname = usePathname();
  const router = useRouter();

  let selectedNexusId: Id<"nexi"> | null = null;
  let selectedNotebookId: Id<"notebooks"> | undefined = undefined;

  const pathSegments = pathname.split("/").filter(Boolean);
  if (pathSegments[0] === "nexi") {
    if (pathSegments[1]) {
      selectedNexusId = pathSegments[1] as Id<"nexi">;
    }
    if (pathSegments[2] === "loci" && pathSegments[3]) {
      selectedNotebookId = pathSegments[3] as Id<"notebooks">;
    }
  }

  const handleNexusSelect = (nexusId: Id<"nexi">) => {
    router.push(`/nexi/${nexusId}`);
  };

  return (
    <TreeView
      onNexusSelected={handleNexusSelect}
      selectedNexusId={selectedNexusId}
      selectedLocusId={selectedNotebookId}
    />
  );
}


