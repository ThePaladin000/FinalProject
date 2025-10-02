"use client";

import React, { memo } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getMetaTagColorClasses, MetaTagColor } from "../utils/metaTagColors";
import LargeLoadingSpinner from "./LargeLoadingSpinner";
const MarkdownRenderer = dynamic(() => import("./MarkdownRenderer"), { ssr: false });

interface ChunkWithMetaTag {
    _id: Id<"chunks">;
    originalText: string;
    userEditedText?: string;
    metaTag?: {
        _id: Id<"metaTags">;
        name: string;
        displayColor: "BLUE" | "GREEN" | "YELLOW" | "RED" | "PURPLE";
        description: string;
        isSystem: boolean;
        createdAt: number;
        updatedAt: number;
    } | null;
}

interface LinkedChunkDisplayProps {
    chunkId: Id<"chunks">;
    chunk: ChunkWithMetaTag;
    onNavigateToParent?: (notebookId: Id<"notebooks">) => void;
}

function LinkedChunkDisplay({
    chunkId,
    chunk,
    onNavigateToParent
}: LinkedChunkDisplayProps) {
    // Get shadow chunk info to find the parent
    const shadowInfo = useQuery(api.queries.getShadowChunkInfo, { chunkId });

    // Show loading state while shadow info is loading
    if (shadowInfo === undefined) {
        return (
            <div className="bg-gray-800 rounded-lg border-2 border-gray-700 relative p-4">
                <div className="flex items-center justify-center">
                    <LargeLoadingSpinner size={24} color="#8b5cf6" />
                </div>
            </div>
        );
    }

    // Get meta tag border color
    let borderColor = 'border-gray-700';
    if (chunk.metaTag && chunk.metaTag.displayColor) {
        try {
            borderColor = getMetaTagColorClasses(chunk.metaTag.displayColor as MetaTagColor, 'border');
        } catch {
            console.warn('Invalid meta tag color:', chunk.metaTag.displayColor);
            borderColor = 'border-gray-700';
        }
    }

    const handleNavigateToParent = () => {
        if (shadowInfo?.sourceNotebook?._id && onNavigateToParent) {
            onNavigateToParent(shadowInfo.sourceNotebook._id);
        }
    };

    return (
        <div className={`bg-gray-800 rounded-lg border-2 ${borderColor} relative p-4`}>
            {/* Meta Tag Indicator */}
            {chunk.metaTag && (
                <div
                    className={`absolute top-0 left-0 w-2 h-full ${getMetaTagColorClasses(chunk.metaTag.displayColor as MetaTagColor, 'bg')} rounded-l-lg`}
                    title={`Meta Tag: ${chunk.metaTag.name}`}
                />
            )}

            {/* Linked Chunk Content */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Link Icon - Clickable to navigate to parent */}
                    <button
                        onClick={handleNavigateToParent}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                        title="Navigate to parent notebook"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </button>

                    {/* Chunk Info */}
                    <div className="flex-1">
                        <div className="text-sm text-gray-300 font-medium">
                            <MarkdownRenderer content={chunk.userEditedText || chunk.originalText} />
                        </div>
                        {shadowInfo?.sourceNotebook && (
                            <div className="text-xs text-gray-400">
                                From: {shadowInfo.sourceNotebook.name}
                            </div>
                        )}
                        {shadowInfo?.connection?.description && (
                            <div className="text-xs text-gray-500 mt-1">
                                {shadowInfo.connection.description}
                            </div>
                        )}
                    </div>

                    {/* Copy to Clipboard Button */}
                    <button
                        onClick={() => {
                            const content = chunk.userEditedText || chunk.originalText;
                            navigator.clipboard.writeText(content).then(() => {
                                console.log('Content copied to clipboard');
                            }).catch(err => {
                                console.error('Failed to copy content: ', err);
                            });
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-200 text-xs rounded transition-colors"
                        title="Copy chunk content to clipboard"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                    </button>
                </div>
            </div>
        </div>
    );
}

function areEqual(prev: LinkedChunkDisplayProps, next: LinkedChunkDisplayProps) {
  // Ignore handler identity; compare content and meta that influence render
  return (
    prev.chunkId === next.chunkId &&
    (prev.chunk.userEditedText || "") === (next.chunk.userEditedText || "") &&
    prev.chunk.originalText === next.chunk.originalText &&
    (prev.chunk.metaTag?._id || null) === (next.chunk.metaTag?._id || null) &&
    (prev.chunk.metaTag?.displayColor || null) === (next.chunk.metaTag?.displayColor || null)
  );
}

export default memo(LinkedChunkDisplay, areEqual);