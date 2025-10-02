"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState } from "react";

export default function DebugOrphanedData() {
  const orphanedData = useQuery(api.queries.findOrphanedData);
  const assignOrphanedData = useMutation(api.mutations.assignOrphanedDataToUser);
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{
    dryRun: boolean;
    targetUserId: string;
    summary: string;
    wouldFix?: {
      chunks: number;
      nexi: number;
      notebooks: number;
      tags: number;
      attachments: number;
      jems: number;
      connections: number;
      conversations: number;
      messages: number;
      contentItems: number;
    };
    fixed?: {
      chunks: number;
      nexi: number;
      notebooks: number;
      tags: number;
      attachments: number;
      jems: number;
      connections: number;
      conversations: number;
      messages: number;
      contentItems: number;
      total: number;
    };
    error?: string;
  } | null>(null);

  const handleDryRun = async () => {
    setIsFixing(true);
    try {
      const result = await assignOrphanedData({ dryRun: true });
      setFixResult(result);
    } catch (error) {
      console.error("Dry run failed:", error);
      setFixResult({
        dryRun: true,
        targetUserId: "",
        summary: "Error occurred",
        error: String(error)
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleActualFix = async () => {
    if (!confirm("Are you sure you want to assign all orphaned data to user_30nwTtRAwOS34muVHyICPGq9xVT? This cannot be undone!")) {
      return;
    }

    setIsFixing(true);
    try {
      const result = await assignOrphanedData({ dryRun: false });
      setFixResult(result);
    } catch (error) {
      console.error("Fix failed:", error);
      setFixResult({
        dryRun: false,
        targetUserId: "",
        summary: "Error occurred",
        error: String(error)
      });
    } finally {
      setIsFixing(false);
    }
  };

  if (!orphanedData) {
    return <div className="p-4 text-white">Loading debug data...</div>;
  }

  return (
    <div className="p-4 bg-gray-900 text-white max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug: Orphaned Data Analysis</h1>
      
      {/* Nexi without owners */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">
          Nexi without owners ({orphanedData.nexiWithoutOwners.length})
        </h2>
        <div className="text-sm text-gray-300 mb-4">
          Should only contain shared USER MANUAL. Any others are problematic.
        </div>
        {orphanedData.nexiWithoutOwners.length === 0 ? (
          <div className="text-green-400">✓ No nexi without owners found</div>
        ) : (
          <div className="space-y-2">
            {orphanedData.nexiWithoutOwners.map((nexus) => (
              <div key={nexus.id} className="bg-gray-800 p-3 rounded">
                <div><strong>Name:</strong> {nexus.name}</div>
                <div><strong>ID:</strong> {nexus.id}</div>
                {nexus.guestSessionId && (
                  <div><strong>Guest Session:</strong> {nexus.guestSessionId}</div>
                )}
                {nexus.name !== "USER MANUAL" && (
                  <div className="text-red-400 mt-2">⚠️ This nexus should have an owner!</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chunks without owners */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">
          Chunks without owners: {orphanedData.chunksWithoutOwners}
        </h2>
        <div className="text-sm text-gray-300 mb-4">
          All chunks should have an ownerId. Any without are problematic.
        </div>
        {orphanedData.chunksWithoutOwners === 0 ? (
          <div className="text-green-400">✓ No chunks without owners found</div>
        ) : (
          <div className="text-red-400">
            ⚠️ Found {orphanedData.chunksWithoutOwners} chunks without owners - these need to be fixed!
          </div>
        )}
      </div>

      {/* Exploratory chunks analysis */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">
          Exploratory Chunks Analysis ({orphanedData.totalExploratoryChunks} total)
        </h2>
        <div className="text-sm text-gray-300 mb-4">
          Shows ownership chain for all EXPLORATORY chunks to identify problematic ones.
        </div>
        {orphanedData.exploratoryChunksWithContext.length === 0 ? (
          <div className="text-gray-400">No exploratory chunks found</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {orphanedData.exploratoryChunksWithContext.map((chunk, index) => (
              <div key={chunk.chunkId} className="bg-gray-800 p-3 rounded text-sm">
                <div className="font-medium mb-2">Chunk #{index + 1}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div><strong>Chunk ID:</strong> {chunk.chunkId}</div>
                    <div><strong>Chunk Owner:</strong> {chunk.chunkOwnerId || "❌ NONE"}</div>
                    <div><strong>Notebook:</strong> {chunk.notebookName}</div>
                    <div><strong>Notebook Owner:</strong> {chunk.notebookOwnerId || "❌ NONE"}</div>
                  </div>
                  <div>
                    <div><strong>Nexus:</strong> {chunk.nexusName}</div>
                    <div><strong>Nexus Owner:</strong> {chunk.nexusOwnerId || "❌ NONE"}</div>
                    {chunk.nexusGuestSessionId && (
                      <div><strong>Guest Session:</strong> {chunk.nexusGuestSessionId}</div>
                    )}
                  </div>
                </div>
                {(!chunk.chunkOwnerId || !chunk.nexusOwnerId) && (
                  <div className="text-red-400 mt-2 font-medium">
                    ⚠️ PROBLEMATIC: Missing ownership in chain
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fix Actions */}
      <div className="mt-8 p-4 bg-blue-900 rounded">
        <h3 className="font-semibold mb-4">Fix Orphaned Data</h3>
        <div className="space-y-4">
          <div className="text-sm text-gray-300">
            This will assign all orphaned data to user: <code className="bg-gray-800 px-2 py-1 rounded">user_30nwTtRAwOS34muVHyICPGq9xVT</code>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleDryRun}
              disabled={isFixing}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded font-medium"
            >
              {isFixing ? "Running..." : "Dry Run (Preview Changes)"}
            </button>

            <button
              onClick={handleActualFix}
              disabled={isFixing}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded font-medium"
            >
              {isFixing ? "Fixing..." : "Actually Fix Data"}
            </button>
          </div>
        </div>
      </div>

      {/* Fix Results */}
      {fixResult && (
        <div className="mt-6 p-4 bg-gray-800 rounded">
          <h3 className="font-semibold mb-4">
            {fixResult.dryRun ? "Dry Run Results" : "Fix Results"}
          </h3>

          {fixResult.error ? (
            <div className="text-red-400">
              <strong>Error:</strong> {fixResult.error}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-green-400 font-medium">
                {fixResult.summary}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div><strong>Chunks:</strong> {fixResult.dryRun ? fixResult.wouldFix?.chunks ?? 0 : fixResult.fixed?.chunks ?? 0}</div>
                  <div><strong>Nexi:</strong> {fixResult.dryRun ? fixResult.wouldFix?.nexi ?? 0 : fixResult.fixed?.nexi ?? 0}</div>
                  <div><strong>Notebooks:</strong> {fixResult.dryRun ? fixResult.wouldFix?.notebooks ?? 0 : fixResult.fixed?.notebooks ?? 0}</div>
                  <div><strong>Tags:</strong> {fixResult.dryRun ? fixResult.wouldFix?.tags ?? 0 : fixResult.fixed?.tags ?? 0}</div>
                  <div><strong>Attachments:</strong> {fixResult.dryRun ? fixResult.wouldFix?.attachments ?? 0 : fixResult.fixed?.attachments ?? 0}</div>
                </div>
                <div>
                  <div><strong>Jems:</strong> {fixResult.dryRun ? fixResult.wouldFix?.jems ?? 0 : fixResult.fixed?.jems ?? 0}</div>
                  <div><strong>Connections:</strong> {fixResult.dryRun ? fixResult.wouldFix?.connections ?? 0 : fixResult.fixed?.connections ?? 0}</div>
                  <div><strong>Conversations:</strong> {fixResult.dryRun ? fixResult.wouldFix?.conversations ?? 0 : fixResult.fixed?.conversations ?? 0}</div>
                  <div><strong>Messages:</strong> {fixResult.dryRun ? fixResult.wouldFix?.messages ?? 0 : fixResult.fixed?.messages ?? 0}</div>
                  <div><strong>Content Items:</strong> {fixResult.dryRun ? fixResult.wouldFix?.contentItems ?? 0 : fixResult.fixed?.contentItems ?? 0}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
