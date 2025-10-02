"use client";

import React, { useState, useRef, memo } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Chunk } from "../utils/chunking";

import { getMetaTagColorClasses } from "../utils/metaTagColors";
const MarkdownRenderer = dynamic(() => import("./MarkdownRenderer"), { ssr: false });
import { useVirtualizer } from "@tanstack/react-virtual";
import ChunkTagsModal from "./ChunkTagsModal";

interface ChunkDisplayProps {
    chunks: Chunk[];
    selectedNotebookId?: Id<"notebooks">; // Add notebook ID to fetch tags
    selectedNexusId?: Id<"nexi">; // Add nexus ID for ChunkTagsModal
    onChunkEdit?: (chunkId: string, newContent: string) => void;
    onChunkDelete?: (chunkId: string) => void;
    onChunkSave?: (chunk: Chunk, metaTagId?: string) => Promise<void>;
    onChunkTagsChange?: (chunkId: string, tagIds: string[]) => void; // Add tag change handler
    onChunkMetaTagChange?: (chunkId: string, metaTagName: string) => void; // Add meta tag change handler
    chunkMetaTags?: Record<string, string>; // Add chunk meta tags state
    className?: string;
}

function ChunkDisplay({
    chunks,
    selectedNotebookId,
    selectedNexusId,
    onChunkEdit,
    onChunkDelete,
    onChunkSave,
    onChunkTagsChange,
    onChunkMetaTagChange,
    chunkMetaTags: propChunkMetaTags,
    className = ""
}: ChunkDisplayProps) {
    const { getToken } = useAuth();
    const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [localChunkTags, setLocalChunkTags] = useState<Record<string, string[]>>({});
    const [savingChunkId, setSavingChunkId] = useState<string | null>(null);
    const [localChunkMetaTags, setLocalChunkMetaTags] = useState<Record<string, string>>({});
    const [isSummarizing, setIsSummarizing] = useState(false);

    // Tags modal state
    const [tagsModal, setTagsModal] = useState<{
        isOpen: boolean;
        chunkId: string | null;
    }>({
        isOpen: false,
        chunkId: null,
    });

    // Use prop chunkMetaTags if provided, otherwise use local state
    const chunkMetaTags = propChunkMetaTags || localChunkMetaTags;

    // Mutations
    const assignTagsToChunk = useMutation(api.mutations.assignTagsToChunk);
    const assignMetaTagToChunk = useMutation(api.mutations.assignMetaTagToChunk);

    // Fetch meta tags scoped by user
    const { userId } = useAuth();
    const metaTags = useQuery(api.queries.getMetaTags, userId ? { ownerId: userId } : {}) || [];

    // Fetch notebook tags if notebook is selected
    const notebookTags = useQuery(
        api.queries.getTagsByNotebook,
        selectedNotebookId && userId ? { notebookId: selectedNotebookId, ownerId: userId } : "skip"
    ) || [];

    // Remove auto-assignment logic - chunks should not have meta tags until user selects one

    const handleMetaTagSelect = async (chunkId: string, metaTagName: string | undefined) => {
        // Update local state
        setLocalChunkMetaTags(prev => ({
            ...prev,
            [chunkId]: metaTagName || ''
        }));

        // Call the parent handler if provided
        if (onChunkMetaTagChange) {
            onChunkMetaTagChange(chunkId, metaTagName || '');
        }

        // Find the meta tag ID for the selected meta tag name
        const selectedMetaTag = metaTags?.find(tag => tag.name === metaTagName);
        const metaTagId = selectedMetaTag?._id;

        // For temporary chunks (manual, error, or chunking utility), we'll handle persistence when they're saved to the database
        // For already-saved chunks (proper Convex IDs), persist immediately
        const isConvexId = chunkId && !chunkId.startsWith('error_') && !chunkId.startsWith('manual_') && !chunkId.startsWith('chunk_');

        if (isConvexId) {
            try {
                await assignMetaTagToChunk({
                    chunkId: chunkId as Id<"chunks">,
                    metaTagId: metaTagId,
                });
            } catch (error) {
                console.error('Error assigning meta tag to chunk:', error);
                // Revert the local state if the mutation fails
                setLocalChunkMetaTags(prev => {
                    const newState = { ...prev };
                    delete newState[chunkId];
                    return newState;
                });
            }
        }
        // Note: Temporary chunks will persist meta tags when saved to database
    };

    const handleTagToggle = async (chunkId: string, tagId: string) => {
        // Get current tags for this chunk (from local state for unsaved chunks)
        const currentTags = localChunkTags[chunkId] || [];

        // Toggle the tag
        const newTagIds = currentTags.includes(tagId)
            ? currentTags.filter(id => id !== tagId)
            : [...currentTags, tagId];

        // Update local state
        setLocalChunkTags(prev => ({
            ...prev,
            [chunkId]: newTagIds
        }));

        // Call the parent handler if provided
        onChunkTagsChange?.(chunkId, newTagIds);

        // For temporary chunks (manual, error, or chunking utility), we'll handle persistence when they're saved to the database
        // For already-saved chunks (proper Convex IDs), persist immediately
        const isConvexId = chunkId && !chunkId.startsWith('error_') && !chunkId.startsWith('manual_') && !chunkId.startsWith('chunk_');

        if (isConvexId) {
            try {
                await assignTagsToChunk({
                    chunkId: chunkId as Id<"chunks">,
                    tagIds: newTagIds as Id<"tags">[]
                });
            } catch (error) {
                console.error('Error assigning tags to chunk:', error);
            }
        }
    };

    const handleEditStart = (chunk: Chunk) => {
        setEditingChunkId(chunk.id);
        setEditContent(chunk.content);
    };

    const handleEditSave = () => {
        if (editingChunkId && onChunkEdit) {
            onChunkEdit(editingChunkId, editContent);
        }
        setEditingChunkId(null);
        setEditContent("");
    };

    const handleEditCancel = () => {
        setEditingChunkId(null);
        setEditContent("");
    };

    const handleChunkSave = async (chunk: Chunk) => {
        if (!onChunkSave) return;

        setSavingChunkId(chunk.id);
        try {
            // Get the selected meta tag ID for this chunk
            const selectedMetaTagName = chunkMetaTags[chunk.id];
            const selectedMetaTag = metaTags?.find(tag => tag.name === selectedMetaTagName);
            const metaTagId = selectedMetaTag?._id;



            await onChunkSave(chunk, metaTagId);
        } catch (error) {
            console.error('Error saving chunk:', error);
        } finally {
            setSavingChunkId(null);
        }
    };
    const safeChunks = chunks || [];

    const parentRef = useRef<HTMLDivElement | null>(null);
    const rowVirtualizer = useVirtualizer({
        count: safeChunks.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 220,
        overscan: 6,
    });
    const virtualItems = rowVirtualizer.getVirtualItems();

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-white">Generated Chunks</h3>
                <div className="text-base text-gray-400">
                    {safeChunks.length} chunk{safeChunks.length !== 1 ? 's' : ''}
                </div>
            </div>

            {safeChunks.length === 0 ? (
                <div className={`text-center text-gray-400 py-8`}>
                    <div className="text-2xl font-medium mb-2">No chunks created yet</div>
                    <div className="text-base">Send a message to see chunks appear here</div>
                </div>
            ) : (
                <div ref={parentRef} className="space-y-3 overflow-auto" style={{ maxHeight: "70vh" }}>
                    <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                        {virtualItems.map((v) => {
                        const chunk = safeChunks[v.index];
                    const selectedMetaTag = metaTags?.find(tag => tag.name === chunkMetaTags[chunk.id]);
                    const selectedTags = localChunkTags[chunk.id] || [];
                    const borderColor = selectedMetaTag
                        ? getMetaTagColorClasses(selectedMetaTag.displayColor, 'border')
                        : 'border-gray-700';

                        return (
                        <div
                            key={chunk.id}
                            className={`bg-gray-800 rounded-lg border-2 ${borderColor}`}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${v.start}px)` }}
                        >
                            {/* Standard Tags Display */}
                            <div className="px-3 py-2 border-b border-gray-700 bg-gray-750">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-wrap gap-1">
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-400">
                                            No tags
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setTagsModal({ isOpen: true, chunkId: chunk.id })}
                                            className="text-gray-400 hover:text-purple-400 p-1"
                                            title="Manage tags"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                        </button>

                                        {/* Save Button */}
                                        {onChunkSave && (
                                            <button
                                                onClick={() => handleChunkSave(chunk)}
                                                disabled={savingChunkId === chunk.id}
                                                className="text-green-400 hover:text-green-300 p-1 disabled:text-gray-500 disabled:cursor-not-allowed"
                                                title="Save chunk to notebook"
                                            >
                                                {savingChunkId === chunk.id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}

                                        {editingChunkId === chunk.id ? (
                                            <>
                                                <button
                                                    onClick={handleEditSave}
                                                    className="text-green-400 hover:text-green-300 p-1"
                                                    title="Save changes"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={handleEditCancel}
                                                    className="text-red-400 hover:text-red-300 p-1"
                                                    title="Cancel edit"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleEditStart(chunk)}
                                                    className="text-gray-400 hover:text-white p-1"
                                                    title="Edit chunk"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => onChunkDelete?.(chunk.id)}
                                                    className="text-gray-400 hover:text-red-400 p-1"
                                                    title="Delete chunk"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Tag Selection Area */}
                                {notebookTags.length > 0 && (
                                    <div className="px-3 py-2 border-b border-gray-700 bg-gray-750">
                                        <div className="text-xs text-gray-400 mb-2">Standard Tags:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {(() => {
                                                const currentTags = selectedTags || [];

                                                if (currentTags.length > 0) {
                                                    return (
                                                        <div className="flex items-center gap-1">
                                                            {currentTags.map((tagId) => {
                                                                const tag = notebookTags.find(t => t._id === tagId);
                                                                if (!tag) return null;
                                                                return (
                                                                    <span key={tag._id} className="px-2 py-1 rounded text-xs font-medium bg-gray-600 text-gray-200">
                                                                        {tag.name}
                                                                    </span>
                                                                );
                                                            })}
                                                            <div className="relative group">
                                                                <button
                                                                    className="text-purple-400 hover:text-purple-300 p-1"
                                                                    title="Manage tags"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                                    </svg>
                                                                </button>
                                                                <div className="absolute right-0 top-6 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto min-w-32">
                                                                    <div className="text-xs text-gray-400 mb-1">Manage tags:</div>
                                                                    <div className="space-y-1">
                                                                        {notebookTags.map((tag) => (
                                                                            <button
                                                                                key={tag._id}
                                                                                onClick={() => handleTagToggle(chunk.id, tag._id)}
                                                                                className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors ${currentTags.includes(tag._id)
                                                                                    ? 'bg-gray-600 text-gray-200'
                                                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                                                    }`}
                                                                                title={tag.description}
                                                                            >
                                                                                {tag.name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div className="flex items-center gap-1">
                                                            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">
                                                                No tags
                                                            </span>
                                                            <div className="relative group">
                                                                <button
                                                                    className="text-gray-400 hover:text-white p-1"
                                                                    title="Add tags"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                                    </svg>
                                                                </button>
                                                                <div className="absolute right-0 top-6 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto min-w-32">
                                                                    <div className="text-xs text-gray-400 mb-1">Add tags:</div>
                                                                    <div className="space-y-1">
                                                                        {notebookTags.map((tag) => (
                                                                            <button
                                                                                key={tag._id}
                                                                                onClick={() => handleTagToggle(chunk.id, tag._id)}
                                                                                className="w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600"
                                                                                title={tag.description}
                                                                            >
                                                                                {tag.name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {/* Meta Tag Selection Area */}
                                {metaTags && metaTags.length > 0 && (
                                    <div className="px-3 py-2 border-b border-gray-700 bg-gray-750">
                                        <div className="text-xs text-gray-400 mb-2">Meta Tag:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {metaTags.map((metaTag) => {
                                                const isSelected = chunkMetaTags[chunk.id] === metaTag.name;
                                                return (
                                                    <button
                                                        key={metaTag._id}
                                                        onClick={() => handleMetaTagSelect(chunk.id, metaTag.name)}
                                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${isSelected
                                                            ? `${getMetaTagColorClasses(metaTag.displayColor, 'bg')} text-white`
                                                            : `bg-gray-700 text-gray-300 hover:${getMetaTagColorClasses(metaTag.displayColor, 'bg')} hover:text-white`
                                                            }`}
                                                        title={`${metaTag.name}: ${metaTag.description}${isSelected ? ' (Current)' : ' (Click to select)'}`}
                                                    >
                                                        {metaTag.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Chunk Content */}
                                <div className="py-2 px-3">
                                    {editingChunkId === chunk.id ? (
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.ctrlKey && e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleEditSave();
                                                }
                                            }}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            rows={Math.max(3, editContent.split('\n').length)}
                                        />
                                    ) : (
                                        <div className="text-gray-300 text-base">
                                            <MarkdownRenderer content={chunk.content} />
                                        </div>
                                    )}
                                </div>

                                {/* Copy to Clipboard Button - Only show when not editing */}
                                {editingChunkId !== chunk.id && (
                                    <div className="px-3 py-2 flex justify-end">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(chunk.content).then(() => {
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
                                )}

                                {/* Source Info and Summarize Button */}
                                <div className="px-3 pb-2 flex justify-between items-center">
                                    <div className="text-xs text-gray-400">
                                        google/gemini-2.0-flash
                                    </div>
                                    {editingChunkId === chunk.id && (
                                        <button
                                            onClick={async () => {
                                                if (isSummarizing) return; // Prevent multiple clicks
                                                setIsSummarizing(true);
                                                try {
                                                    const token = await getToken({ template: "convex" });
                                                    const response = await fetch('/api/summarize', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                                        },
                                                        body: JSON.stringify({
                                                            text: editContent
                                                        }),
                                                    });

                                                    if (response.ok) {
                                                        const data = await response.json();
                                                        const summaryText = typeof data.summary === 'string' ? data.summary : '';
                                                        if (summaryText) setEditContent(summaryText);
                                                        else console.error('No summary found in response:', data);
                                                    }
                                                } catch (error) {
                                                    console.error('Error summarizing text:', error);
                                                    // Show user-friendly error message
                                                    const errorMessage = error instanceof Error ? error.message : 'Failed to summarize text. Please try again.';
                                                    alert(`Summarization Error: ${errorMessage}`);
                                                } finally {
                                                    setIsSummarizing(false);
                                                }
                                            }}
                                            disabled={isSummarizing}
                                            className={`${isSummarizing ? 'bg-orange-500 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'} text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1`}
                                            title="Summarize text using AI"
                                        >
                                            {isSummarizing ? (
                                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            )}
                                            {isSummarizing ? 'Summarizing...' : 'Summarize'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        );
                    })}
                    </div>
                </div>
            )}

            {/* Chunk Tags Modal */}
            {tagsModal.isOpen && tagsModal.chunkId && selectedNotebookId && selectedNexusId && (
                <ChunkTagsModal
                    isOpen={tagsModal.isOpen}
                    onClose={() => setTagsModal({ isOpen: false, chunkId: null })}
                    chunkId={tagsModal.chunkId as Id<"chunks">}
                    notebookId={selectedNotebookId as Id<"notebooks">}
                    nexusId={selectedNexusId}
                />
            )}
        </div>
    );
}

export default memo(ChunkDisplay);