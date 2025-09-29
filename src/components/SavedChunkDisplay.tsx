"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { LinkIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import MetaTagSelector from "./MetaTagSelector";
import { getMetaTagColorClasses, MetaTagColor } from "../utils/metaTagColors";
const MarkdownRenderer = dynamic(() => import("./MarkdownRenderer"), { ssr: false });
const ChunkTagsModal = dynamic(() => import("./ChunkTagsModal"), { ssr: false });
const AttachmentModal = dynamic(() => import("./AttachmentModal"), { ssr: false });
const ConnectionsModal = dynamic(() => import("./ConnectionsModal"), { ssr: false });
const MoveModal = dynamic(() => import("./MoveModal"), { ssr: false });
import MoveDropdown from "./MoveDropdown";
import LinkedChunkDisplay from "./LinkedChunkDisplay";
import LargeLoadingSpinner from "./LargeLoadingSpinner";
import InfoModal from "./InfoModal";
import { safeUrl } from "../utils/safeUrl";

// dnd-kit imports for drag and drop
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
    DragOverlay,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SavedChunkDisplayProps {
    notebookId: Id<"notebooks">;
    nexusId?: Id<"nexi">;
    selectedTagId?: Id<"tags"> | null;
    onChunkEdit?: (chunkId: Id<"chunks">, newContent: string) => void;
    onChunkDelete?: (chunkId: Id<"chunks">) => void;
    onChunkAdd?: () => void;
    onNavigateToNotebook?: (notebookId: Id<"notebooks">) => void;
    className?: string;
    scrollToChunkId?: Id<"chunks"> | null;
    onScrollToChunkComplete?: () => void;
    viewMode?: "read" | "edit"; // read: paginated minimal view, edit: full list with headers/actions & DnD
    onAnchorChange?: (chunkId: Id<"chunks">) => void;
    forcePage?: number | null;
    onForcePageApplied?: () => void;
    preferLastPage?: boolean;
    onPreferLastPageApplied?: () => void;
}

// Chunk type with metaTag and tags from query
type ChunkWithMetaTag = {
    _id: Id<"chunks">;
    _creationTime: number;
    notebookId: Id<"notebooks">;
    originalText: string;
    userEditedText?: string;
    title?: string;
    chunkType: "text" | "image" | "video" | "audio" | "code" | "document";
    source?: string;
    createdAt: number;
    updatedAt: number;
    metaTagId?: Id<"metaTags">;
    metaTag?: {
        _id: Id<"metaTags">;
        name: string;
        displayColor: "BLUE" | "GREEN" | "YELLOW" | "RED" | "PURPLE";
        description: string;
        isSystem: boolean;
        createdAt: number;
        updatedAt: number;
    } | null;
    tags?: {
        _id: Id<"tags">;
        name: string;
        description?: string;
        notebookId: Id<"notebooks">;
        parentTagId?: Id<"tags">;
        createdAt: number;
        updatedAt: number;
    }[];
    _locusPosition?: number;
};

type MetaTag = {
    _id: Id<"metaTags">;
    name: string;
    displayColor: "BLUE" | "GREEN" | "YELLOW" | "RED" | "PURPLE";
    description: string;
    isSystem: boolean;
    createdAt: number;
    updatedAt: number;
};

// Minimized chunk component
interface MinimizedChunkProps {
    chunk: ChunkWithMetaTag;
    borderColor: string;
    onExpand: () => void;
    dragHandleProps?: object;
    isDragging?: boolean;
}

function MinimizedChunk({ chunk, borderColor, onExpand, dragHandleProps, isDragging }: MinimizedChunkProps) {
    return (
        <div
            className={`bg-gray-800 rounded-lg border-2 ${borderColor} relative flex items-center px-3 pl-5 ${isDragging ? 'opacity-50' : ''}`}
            style={{
                height: '48px', // Explicit height instead of h-12 class
                minHeight: '48px',
                maxHeight: '48px',
                width: '100%',
                boxSizing: 'border-box',
                // Prevent any flex shrinking/growing that could cause deformation
                flexShrink: 0,
                flexGrow: 0,
            }}
        >
            {/* Meta Tag Indicator */}
            {chunk.metaTag && (
                <div
                    className={`absolute top-0 left-0 w-2 h-full ${getMetaTagColorClasses(chunk.metaTag.displayColor as MetaTagColor, 'bg')} rounded-l-lg`}
                />
            )}

            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {chunk.metaTag && (
                        <div
                            className={`text-xs px-2 py-1 rounded-lg ${getMetaTagColorClasses(chunk.metaTag.displayColor as MetaTagColor, 'bg')} text-white font-medium flex-shrink-0`}
                        >
                            {chunk.metaTag.name}
                        </div>
                    )}
                    {/* Clickable text area with hover effect */}
                    <div
                        onClick={onExpand}
                        className="flex-1 cursor-pointer group"
                        title="Click to expand snippet"
                    >
                        <span className="text-xs text-gray-400 truncate block group-hover:text-gray-300 transition-colors">
                            {(chunk.userEditedText || chunk.originalText).substring(0, 50)}
                            {(chunk.userEditedText || chunk.originalText).length > 50 ? '...' : ''}
                        </span>
                    </div>
                </div>

                {/* Drag handle */}
                {dragHandleProps && (
                    <div
                        {...dragHandleProps}
                        className="text-xs text-gray-500 ml-2 flex-shrink-0 hover:text-gray-200 transition-colors p-1 cursor-grab active:cursor-grabbing"
                        title="Drag to reorder"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}

// Individual draggable chunk component
interface SortableChunkProps {
    chunk: ChunkWithMetaTag;
    selectedTags: string[];
    chunkAttachments: { _id: Id<"attachments">; name: string; url: string; createdAt: number }[];
    chunkConnections: number;
    isEditing: boolean;
    editContent: string;
    isUpdating: boolean;
    isDragDisabled: boolean;
    metaTags: MetaTag[];
    isMinimized: boolean;
    viewMode: "read" | "edit";
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
    onTagsClick: () => void;
    onAttachmentsClick: () => void;
    onConnectionsClick: () => void;
    onMoveToTop: () => void;
    onMoveToBottom: () => void;
    onMoveToDifferentLocus: () => void;
    onAttachmentDelete: (attachmentId: Id<"attachments">) => void;
    onEditContentChange: (content: string) => void;
    onToggleMinimize: () => void;
    textareaRef: (el: HTMLTextAreaElement | null) => void;
}

function SortableChunk({
    chunk,
    selectedTags,
    chunkAttachments,
    chunkConnections,
    isEditing,
    editContent,
    isUpdating,
    isDragDisabled,
    metaTags,
    isMinimized,
    viewMode,
    onEdit,
    onSave,
    onCancel,
    onDelete,
    onTagsClick,
    onAttachmentsClick,
    onConnectionsClick,
    onMoveToTop,
    onMoveToBottom,
    onMoveToDifferentLocus,
    onAttachmentDelete,
    onEditContentChange,
    onToggleMinimize,
    textareaRef,
    onNavigateToParent,
}: SortableChunkProps & { onNavigateToParent?: (notebookId: Id<"notebooks">) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: chunk._id,
        disabled: isDragDisabled || isEditing,
    });

    // Check if this is a linked chunk (shadow chunk)
    const shadowInfo = useQuery(api.queries.getShadowChunkInfo, { chunkId: chunk._id });
    const isLinkedChunk = shadowInfo !== undefined && shadowInfo !== null;

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

    const style = {
        transform: CSS.Transform.toString(transform),
        // Disable transitions while dragging to prevent eased, laggy motion
        transition: isDragging ? undefined : transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // If minimized, show the minimized version with drag handle
    if (isMinimized) {
        return (
            <div
                ref={setNodeRef}
                style={style}
            >
                <MinimizedChunk
                    chunk={chunk}
                    borderColor={borderColor}
                    onExpand={onToggleMinimize}
                    dragHandleProps={!isDragDisabled && !isEditing ? { ...attributes, ...listeners } : undefined}
                    isDragging={isDragging}
                />
            </div>
        );
    }

    // If this is a linked chunk, show the minimalist linked chunk display
    if (isLinkedChunk) {
        return (
            <div
                ref={setNodeRef}
                style={style}
            >
                <LinkedChunkDisplay
                    chunkId={chunk._id}
                    chunk={chunk}
                    onNavigateToParent={onNavigateToParent}
                />
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-gray-800 rounded-lg border-2 ${borderColor} relative`}
        >
            {/* Button in top-right corner - Drag handle in edit mode, Copy button in read mode */}
            {!isEditing && (
                viewMode === "read" ? (
                    // Copy Button - visible when in read mode
                    <div
                        className="absolute top-2 right-2 z-10 p-1 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                        title="Copy chunk content to clipboard"
                        onClick={() => {
                            const content = chunk.userEditedText || chunk.originalText;
                            navigator.clipboard.writeText(content).then(() => {
                                console.log('Content copied to clipboard');
                            }).catch(err => {
                                console.error('Failed to copy content: ', err);
                            });
                        }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                ) : (
                    // Drag Handle - visible when in edit mode and drag is enabled
                    !isDragDisabled && (
                        <div
                            {...attributes}
                            {...listeners}
                            className="absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-200 transition-colors"
                            title="Drag to reorder"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                            </svg>
                        </div>
                    )
                )
            )}

            {/* Meta Tag Indicator */}
            {chunk.metaTag && (
                <div
                    className={`absolute top-0 left-0 w-2 h-full ${getMetaTagColorClasses(chunk.metaTag.displayColor as MetaTagColor, 'bg')} rounded-l-lg`}
                    title={`Meta Tag: ${chunk.metaTag.name}`}
                />
            )}

            {/* Meta Tag and Standard Tags Display */}
            {viewMode === "edit" && (
            <div className={`py-2 border-b border-gray-700 bg-gray-750 ${chunk.metaTag ? 'pl-5 pr-3' : 'px-3'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MetaTagSelector
                            chunkId={chunk._id}
                            currentMetaTagId={chunk.metaTag?._id}
                            metaTags={metaTags || []}
                        />

                        {/* Standard Tags Button */}
                        <button
                            onClick={onTagsClick}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-200 text-xs rounded transition-colors"
                            title="Manage tags for this chunk"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            Tags ({selectedTags.length})
                        </button>

                        {/* Attachments Button */}
                        <button
                            onClick={onAttachmentsClick}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-200 text-xs rounded transition-colors"
                            title="Add URL, image, or text file"
                        >
                            <PaperClipIcon className="w-3 h-3" />
                            Attachments ({chunkAttachments.length})
                        </button>

                        {/* Connections Button */}
                        <button
                            onClick={onConnectionsClick}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-200 text-xs rounded transition-colors"
                            title="Display this chunk in a different locus"
                        >
                            <LinkIcon className="w-3 h-3" />
                            Connections ({chunkConnections})
                        </button>

                        {/* Move Dropdown */}
                        <MoveDropdown
                            onMoveToTop={onMoveToTop}
                            onMoveToBottom={onMoveToBottom}
                            onMoveToDifferentLocus={onMoveToDifferentLocus}
                            disabled={false}
                        />
                    </div>
                </div>
            </div>
            )}

            {/* Chunk Content - Only show when not dragging */}
            <div className={`p-3 ${chunk.metaTag ? 'pl-5' : ''}`}>
                {viewMode === "edit" && isEditing ? (
                    <div className="space-y-3">
                        <textarea
                            ref={textareaRef}
                            value={editContent}
                            onChange={(e) => onEditContentChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.ctrlKey && e.key === 'Enter') {
                                    e.preventDefault();
                                    onSave();
                                }
                            }}
                            className="w-full h-40 p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Enter your chunk content..."
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={onSave}
                                disabled={isUpdating}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                            >
                                {isUpdating ? "Saving..." : "Save"}
                            </button>
                            <button
                                onClick={onCancel}
                                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Chunk Content */}
                        <div className="text-gray-200 prose prose-sm max-w-none">
                            <MarkdownRenderer content={chunk.userEditedText || chunk.originalText} />
                        </div>
                        {/* Source Attribution */}
                        {chunk.source && (
                            <div className="mt-3 text-xs text-gray-400">
                                Source: {chunk.source}
                            </div>
                        )}

                        {/* Chunk Actions */}
                        {viewMode === "edit" && (
                        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-700">
                            <button onClick={onEdit} className="text-xs text-blue-400 hover:text-blue-300 font-medium">Edit</button>
                            <button onClick={onToggleMinimize} className="text-xs text-gray-400 hover:text-gray-300 font-medium">Minimize</button>
                            <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 font-medium">Delete</button>
                        </div>
                        )}



                        {/* Attachments Display */}
                        {chunkAttachments.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-gray-700">
                                <div className="flex flex-wrap gap-2">
                                    {chunkAttachments.map((attachment) => (
                                        <div key={attachment._id} className="flex items-center gap-1 bg-gray-700 rounded-lg px-2 py-1">
                                            <a
                                                href={safeUrl(attachment.url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                                                title={attachment.url}
                                            >
                                                <PaperClipIcon className="w-3 h-3" />
                                                {attachment.name}
                                            </a>
                                            <button
                                                onClick={() => onAttachmentDelete(attachment._id)}
                                                className="text-gray-400 hover:text-red-400 text-xs p-0.5"
                                                title="Remove attachment"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function areChunksEqual(prev: SortableChunkProps & { onNavigateToParent?: (notebookId: Id<"notebooks">) => void }, next: SortableChunkProps & { onNavigateToParent?: (notebookId: Id<"notebooks">) => void }) {
  const sameBasic = (
    prev.chunk._id === next.chunk._id &&
    (prev.chunk.userEditedText || "") === (next.chunk.userEditedText || "") &&
    prev.chunk.originalText === next.chunk.originalText &&
    (prev.chunk.metaTag?._id || null) === (next.chunk.metaTag?._id || null) &&
    (prev.chunk.metaTag?.displayColor || null) === (next.chunk.metaTag?.displayColor || null) &&
    prev.chunkConnections === next.chunkConnections &&
    prev.isEditing === next.isEditing &&
    prev.editContent === next.editContent &&
    prev.isUpdating === next.isUpdating &&
    prev.isDragDisabled === next.isDragDisabled &&
    prev.isMinimized === next.isMinimized &&
    prev.viewMode === next.viewMode
  );
  if (!sameBasic) return false;
  // Compare selectedTags
  if (prev.selectedTags.length !== next.selectedTags.length) return false;
  for (let i = 0; i < prev.selectedTags.length; i++) {
    if (prev.selectedTags[i] !== next.selectedTags[i]) return false;
  }
  // Compare attachments ids/length
  if (prev.chunkAttachments.length !== next.chunkAttachments.length) return false;
  for (let i = 0; i < prev.chunkAttachments.length; i++) {
    if (prev.chunkAttachments[i]._id !== next.chunkAttachments[i]._id) return false;
  }
  // Ignore function prop identity
  return true;
}

const MemoSortableChunk = memo(SortableChunk, areChunksEqual);

export default function SavedChunkDisplay({
    notebookId,
    nexusId,
    selectedTagId,
    onChunkEdit,
    onChunkDelete,
    onChunkAdd,
    onNavigateToNotebook,
    className = "",
    scrollToChunkId,
    onScrollToChunkComplete,
    viewMode = "read",
    onAnchorChange,
    forcePage = null,
    onForcePageApplied
}: SavedChunkDisplayProps) {
    // Hold a reference to the onForcePageApplied callback without creating a hook dep
    // Store the callback on a ref to avoid adding it as a hook dependency
    const onForcePageAppliedRef = useRef<(() => void) | undefined>(undefined);
    onForcePageAppliedRef.current = onForcePageApplied;

    // preferLastPage path removed to avoid sticky page issues
    const { userId } = useAuth();
    // State management
    const [editingChunkId, setEditingChunkId] = useState<Id<"chunks"> | null>(null);
    const [editContent, setEditContent] = useState("");
    const [updatingChunkId, setUpdatingChunkId] = useState<Id<"chunks"> | null>(null);

    // Initialize minimizedChunks from localStorage
    const [minimizedChunks, setMinimizedChunks] = useState<Set<Id<"chunks">>>(() => {
        if (typeof window !== 'undefined') {
            const storageKey = `nexus-minimized-chunks-${notebookId}`;
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    return new Set(parsed);
                } catch (error) {
                    console.warn('Failed to parse minimized chunks from localStorage:', error);
                }
            }
        }
        return new Set();
    });

    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        chunkId: Id<"chunks"> | null;
        chunkTitle?: string;
    }>({
        isOpen: false,
        chunkId: null,
        chunkTitle: undefined,
    });
    const [focusChunkId, setFocusChunkId] = useState<Id<"chunks"> | null>(null);
    const [isSeedingMetaTags] = useState(false);
    const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
    // Pagination state
    const [page, setPage] = useState<number>(1);
    const pageSize = 3;

    // Link modal state


    // Attachment modal state
    const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
    const [selectedChunkForAttachment, setSelectedChunkForAttachment] = useState<string | null>(null);
    const [chunkAttachments, setChunkAttachments] = useState<Record<string, { _id: Id<"attachments">; name: string; url: string; createdAt: number }[]>>({});

    // Connections state
    const [chunkConnections, setChunkConnections] = useState<Record<string, number>>({});

    // Tags modal state
    const [tagsModal, setTagsModal] = useState<{
        isOpen: boolean;
        chunkId: Id<"chunks"> | null;
    }>({
        isOpen: false,
        chunkId: null,
    });

    // Connections modal state
    const [connectionsModal, setConnectionsModal] = useState<{
        isOpen: boolean;
        chunkId: Id<"chunks"> | null;
    }>({
        isOpen: false,
        chunkId: null,
    });

    // Move modal state
    const [moveModal, setMoveModal] = useState<{
        isOpen: boolean;
        chunkId: Id<"chunks"> | null;
    }>({
        isOpen: false,
        chunkId: null,
    });

    // Drag and drop state
    const [activeChunk, setActiveChunk] = useState<ChunkWithMetaTag | null>(null);

    // Data queries (paginated)
    const notebookPage = useQuery(
        api.queries.getNotebookViewPage,
        userId && !selectedTagId ? { notebookId, ownerId: userId, page, pageSize } : "skip"
    );
    const tagPage = useQuery(
        api.queries.getChunksByTagPage,
        userId && selectedTagId ? { tagId: selectedTagId, ownerId: userId, page, pageSize } : "skip"
    );
    const metaTagsQuery = useQuery(api.queries.getMetaTags, userId ? { ownerId: userId } : {});

    // Full data for edit mode
    const notebookFull = useQuery(
        api.queries.getNotebookView,
        userId && !selectedTagId && viewMode === "edit" ? { notebookId, ownerId: userId } : "skip"
    );
    const chunksByTagFull = useQuery(
        api.queries.getChunksByTag,
        userId && selectedTagId && viewMode === "edit" ? { tagId: selectedTagId, ownerId: userId } : "skip"
    );

    // Pick current page data and chunks
    const pageData = (selectedTagId ? tagPage : notebookPage) as unknown as {
        chunks?: ChunkWithMetaTag[];
        attachments?: Record<string, { _id: Id<"attachments">; name: string; url: string; createdAt: number }[]>;
        counts?: Record<string, number>;
        metaTags?: MetaTag[];
        totalChunks?: number;
    } | undefined;
    const typedChunks = (
        viewMode === "read"
            ? (pageData?.chunks as ChunkWithMetaTag[] | undefined)
            : (selectedTagId
                ? (chunksByTagFull as unknown as ChunkWithMetaTag[] | undefined)
                : (notebookFull?.chunks as ChunkWithMetaTag[] | undefined))
    );

    // Prefer meta tags from notebook page; fallback to general
    const metaTags = (
        viewMode === "read"
            ? ((notebookPage?.metaTags as MetaTag[] | undefined) ?? (metaTagsQuery as MetaTag[] | undefined))
            : ((notebookFull?.metaTags as MetaTag[] | undefined) ?? (metaTagsQuery as MetaTag[] | undefined))
    );


    // Build chunk ids and shared queries for counts/attachments
    const chunkIdsUnion = (typedChunks || []).map((c) => c._id);
    const countsUnion = useQuery(
        api.queries.getChunkConnectionCounts,
        chunkIdsUnion.length > 0 ? { chunkIds: chunkIdsUnion } : "skip"
    );
    const attachmentsUnion = useQuery(
        api.queries.getAttachmentsForChunks,
        chunkIdsUnion.length > 0 ? { chunkIds: chunkIdsUnion, ownerId: userId || undefined } : "skip"
    );
    // Use bundled counts/attachments when available; otherwise fall back to unions
    const connectionCounts = (
        viewMode === "read"
            ? (pageData?.counts ?? countsUnion)
            : (notebookFull?.counts ?? countsUnion)
    ) as Record<string, number> | undefined;
    const attachmentsMap = (
        viewMode === "read"
            ? (pageData?.attachments ?? attachmentsUnion)
            : (notebookFull?.attachments ?? attachmentsUnion)
    ) as Record<string, { _id: Id<"attachments">; name: string; url: string; createdAt: number }[]> | undefined;

    useEffect(() => {
        if (attachmentsMap) {
            setChunkAttachments(attachmentsMap as Record<string, { _id: Id<"attachments">; name: string; url: string; createdAt: number }[]>);
        }
    }, [attachmentsMap]);

    // Reset to page 1 when locus or filter changes, or when returning to read mode
    useEffect(() => {
        if (viewMode === "read") setPage(1);
    }, [notebookId, selectedTagId, viewMode]);

    // If a forced page is provided (from parent), honor it once and notify parent (using a ref to avoid hook deps)
    useEffect(() => {
        if (viewMode !== "read") return;
        if (!forcePage || typeof forcePage !== 'number') return;
        setPage((prev) => (prev !== forcePage ? forcePage : prev));
        // best-effort notify parent via ref
        const cb = onForcePageAppliedRef.current;
        if (typeof cb === 'function') setTimeout(cb, 0);
    }, [forcePage, viewMode]);

    // Prefer forcing last page when requested (applies once)
    // Remove preferLastPage forcing to avoid sticky second-to-last page; rely on anchor/forcePage only

    // Resolve and navigate to the page that contains scrollToChunkId
    const targetIndexInNotebook = useQuery(
        api.queries.getChunkIndexInNotebook,
        userId && scrollToChunkId && !selectedTagId ? { notebookId, chunkId: scrollToChunkId, ownerId: userId } : "skip"
    ) as number | undefined;
    const targetIndexInTag = useQuery(
        api.queries.getChunkIndexInTag,
        userId && scrollToChunkId && selectedTagId ? { tagId: selectedTagId, chunkId: scrollToChunkId, ownerId: userId } : "skip"
    ) as number | undefined;

    useEffect(() => {
        if (viewMode !== "read") return;
        const idx = selectedTagId ? targetIndexInTag : targetIndexInNotebook;
        if (typeof idx === 'number' && idx >= 0) {
            const newPage = Math.floor(idx / pageSize) + 1;
            if (newPage !== page) setPage(newPage);
        }
    }, [targetIndexInNotebook, targetIndexInTag, selectedTagId, pageSize, page, viewMode]);

    // Scroll to target chunk when scrollToChunkId changes and current page is set
    useEffect(() => {
        if (scrollToChunkId && typedChunks) {
            // Find the chunk element and scroll to it
            const chunkElement = document.getElementById(`chunk-${scrollToChunkId}`);
            if (chunkElement) {
                chunkElement.scrollIntoView({
                    behavior: 'smooth',
                    block: viewMode === "read" ? 'nearest' : 'center'
                });
                // Removed transient highlight border (ring) to avoid extra flashing outline

                // Call the callback to clear the scroll target
                if (onScrollToChunkComplete) {
                    setTimeout(() => {
                        onScrollToChunkComplete();
                    }, 500);
                }
            }
        }
    }, [scrollToChunkId, typedChunks, onScrollToChunkComplete, viewMode]);

    // Track the top-most visible chunk as the current anchor, with debounced update
    useEffect(() => {
        if (!onAnchorChange) return;
        let rafId: number | null = null;
        let lastAnchor: string | null = null;
        const handleScroll = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                // Prefer scrolling container if present (so we compute bottom correctly inside the content panel)
                const scroller = (document.querySelector('[data-scroll-container="true"]') as HTMLElement) || document.documentElement;
                const scrollerRect = scroller.getBoundingClientRect();
                const viewportHeight = scroller === document.documentElement ? window.innerHeight : scrollerRect.height;
                const scrollTop = scroller === document.documentElement ? window.scrollY : scroller.scrollTop;
                const scrollHeight = scroller === document.documentElement ? scroller.scrollHeight : scroller.scrollHeight;
                const scrolledToBottom = (viewportHeight + scrollTop) >= (scrollHeight - 8);
                if (scrolledToBottom && (typedChunks && typedChunks.length > 0)) {
                    const lastId = typedChunks[typedChunks.length - 1]._id as unknown as string;
                    const idAttr = `chunk-${lastId}`;
                    if (lastAnchor !== idAttr) {
                        lastAnchor = idAttr;
                        onAnchorChange(lastId as Id<"chunks">);
                    }
                    return;
                }

                // Otherwise, find first chunk element whose top is within the upper portion of viewport
                const nodes = Array.from(document.querySelectorAll('[id^="chunk-"')) as HTMLElement[];
                let candidate: HTMLElement | null = null;
                for (const el of nodes) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top >= 0 && rect.top < (window.innerHeight * 0.4)) {
                        candidate = el;
                        break;
                    }
                }
                if (!candidate && nodes.length > 0) {
                    // fallback to nearest below top; if none, pick last
                    const firstBelow = nodes.find(el => el.getBoundingClientRect().top >= 0);
                    candidate = firstBelow || nodes[nodes.length - 1];
                }
                if (candidate) {
                    const idAttr = candidate.getAttribute('id');
                    if (idAttr && idAttr.startsWith('chunk-')) {
                        if (lastAnchor !== idAttr) {
                            lastAnchor = idAttr;
                            const cid = idAttr.substring(6) as Id<"chunks">;
                            onAnchorChange(cid);
                        }
                    }
                }
            });
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        // run once to seed
        handleScroll();
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [typedChunks, onAnchorChange, viewMode]);

    // No need to expand window; pagination ensures the page contains the chunk

    // Mutations
    const updateChunk = useMutation(api.mutations.updateChunk);
    const deleteChunk = useMutation(api.mutations.deleteChunk);
    const createChunk = useMutation(api.mutations.createChunk);
    const reorderChunks = useMutation(api.mutations.reorderLocusContentItems);
    const moveChunkToTop = useMutation(api.mutations.moveChunkToTop);
    const moveChunkToBottom = useMutation(api.mutations.moveChunkToBottom);
    const assignMetaTagToChunk = useMutation(api.mutations.assignMetaTagToChunk);

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Allow a small movement before starting drag
            },
        })
    );



    // Focus textarea when focusChunkId is set
    useEffect(() => {
        if (focusChunkId && editingChunkId === focusChunkId) {
            const textarea = textareaRefs.current.get(focusChunkId);
            if (textarea) {
                setTimeout(() => {
                    textarea.focus();
                    setFocusChunkId(null); // Clear the focus target
                }, 50);
            }
        }
    }, [focusChunkId, editingChunkId]);

    // Clean up minimized chunks when chunks are deleted
    useEffect(() => {
        if (typedChunks && minimizedChunks.size > 0) {
            const existingChunkIds = new Set(typedChunks.map(chunk => chunk._id));
            const hasOrphanedChunks = Array.from(minimizedChunks).some(id => !existingChunkIds.has(id));

            if (hasOrphanedChunks) {
                setMinimizedChunks(prev => {
                    const cleanedSet = new Set(Array.from(prev).filter(id => existingChunkIds.has(id)));

                    // Update localStorage with cleaned data
                    if (typeof window !== 'undefined') {
                        try {
                            const storageKey = `nexus-minimized-chunks-${notebookId}`;
                            localStorage.setItem(storageKey, JSON.stringify(Array.from(cleanedSet)));
                        } catch (error) {
                            console.warn('Failed to save cleaned minimized chunks to localStorage:', error);
                        }
                    }

                    return cleanedSet;
                });
            }
        }
    }, [typedChunks, minimizedChunks, notebookId]);

    // Load minimized chunks when notebookId changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storageKey = `nexus-minimized-chunks-${notebookId}`;
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setMinimizedChunks(new Set(parsed));
                } catch (error) {
                    console.warn('Failed to parse minimized chunks from localStorage:', error);
                    setMinimizedChunks(new Set());
                }
            } else {
                setMinimizedChunks(new Set());
            }
        }
    }, [notebookId]);

    // Update connections count when data is available
    useEffect(() => {
        if (connectionCounts) {
            setChunkConnections(connectionCounts);
        }
    }, [connectionCounts]);

    // Drag and drop handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        if (typedChunks) {
            const chunk = typedChunks.find(c => c._id === event.active.id);
            if (chunk) {
                setActiveChunk(chunk);
            }
        }
    }, [typedChunks]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveChunk(null);

        if (!over || active.id === over.id) {
            return;
        }

        if (!typedChunks || selectedTagId) {
            // Don't allow reordering when viewing chunks by tag
            return;
        }

        const oldIndex = typedChunks.findIndex((chunk) => chunk._id === active.id);
        const newIndex = typedChunks.findIndex((chunk) => chunk._id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            // Create the new order by moving the chunk
            const newChunks = [...typedChunks];
            const [movedChunk] = newChunks.splice(oldIndex, 1);
            newChunks.splice(newIndex, 0, movedChunk);

            // Extract just the IDs in the new order
            const newOrder = newChunks.map(chunk => chunk._id);

            try {
                await reorderChunks({
                    locusId: notebookId,
                    contentType: "chunk",
                    itemIds: newOrder,
                    parentId: undefined,
                });
            } catch (error) {
                console.error("Failed to reorder chunks:", error);
            }
        }
    }, [typedChunks, selectedTagId, reorderChunks, notebookId]);

    // Meta tag assignment is now handled by the MetaTagSelector component itself

    // Chunk editing handlers
    const handleEditClick = useCallback((chunk: ChunkWithMetaTag) => {
        setEditingChunkId(chunk._id);
        setEditContent(chunk.userEditedText || chunk.originalText);
        setFocusChunkId(chunk._id);
    }, []);

    const handleSaveEdit = useCallback(async () => {
        if (!editingChunkId) return;

        setUpdatingChunkId(editingChunkId);
        try {
            // If this chunk does not have a meta tag yet, apply CORE on save
            const currentChunk = typedChunks?.find(c => c._id === editingChunkId);
            const hasMeta = !!currentChunk?.metaTag?._id;
            const coreMetaTagId = metaTags?.find(tag => tag.name === 'CORE')?._id;

            if (!hasMeta && coreMetaTagId) {
                // Prefer passing metaTagId in the update mutation for atomicity
                await updateChunk({
                    chunkId: editingChunkId,
                    userEditedText: editContent.trim(),
                    metaTagId: coreMetaTagId,
                });
            } else {
                await updateChunk({
                    chunkId: editingChunkId,
                    userEditedText: editContent.trim(),
                });
                // As a safety net, if no meta tag and CORE id was not available, try assigning via dedicated mutation
                if (!hasMeta && !coreMetaTagId) {
                    try {
                        await assignMetaTagToChunk({ chunkId: editingChunkId, metaTagId: undefined });
                    } catch {
                        // ignore; server-side default will still handle it
                    }
                }
            }

            onChunkEdit?.(editingChunkId, editContent.trim());

            setEditingChunkId(null);
            setEditContent("");
        } catch (error) {
            console.error("Failed to save chunk:", error);
        } finally {
            setUpdatingChunkId(null);
        }
    }, [editingChunkId, typedChunks, metaTags, updateChunk, assignMetaTagToChunk, onChunkEdit, editContent]);

    const handleCancelEdit = useCallback(() => {
        setEditingChunkId(null);
        setEditContent("");
    }, []);

    // Delete handlers
    const handleDeleteClick = useCallback((chunkId: string) => {
        setDeleteModal({
            isOpen: true,
            chunkId: chunkId as Id<"chunks">,
            chunkTitle: undefined,
        });
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteModal.chunkId) return;

        try {
            await deleteChunk({ chunkId: deleteModal.chunkId });
            onChunkDelete?.(deleteModal.chunkId);
        } catch (error) {
            console.error("Failed to delete chunk:", error);
        }

        setDeleteModal({ isOpen: false, chunkId: null, chunkTitle: undefined });
    }, [deleteModal.chunkId, deleteChunk, onChunkDelete]);

    const handleDeleteCancel = useCallback(() => {
        setDeleteModal({ isOpen: false, chunkId: null, chunkTitle: undefined });
    }, []);

    // Link handlers


    // Attachment handlers
    const handleAttachmentsClick = useCallback((chunkId: string) => {
        setSelectedChunkForAttachment(chunkId);
        setAttachmentModalOpen(true);
    }, []);

    const createAttachmentMutation = useMutation(api.mutations.createAttachment);

    const handleAttachmentSave = useCallback(async (name: string, url: string) => {
        if (!selectedChunkForAttachment) return;
        try {
            const newId = await createAttachmentMutation({
                chunkId: selectedChunkForAttachment as Id<"chunks">,
                name,
                url,
            });
            setChunkAttachments(prev => ({
                ...prev,
                [selectedChunkForAttachment]: [
                    ...(prev[selectedChunkForAttachment] || []),
                    { _id: newId as Id<"attachments">, name, url, createdAt: Date.now() }
                ]
            }));
        } catch (error) {
            console.error("Failed to create attachment:", error);
        }

        setAttachmentModalOpen(false);
        setSelectedChunkForAttachment(null);
    }, [selectedChunkForAttachment, createAttachmentMutation]);

    const deleteAttachmentMutation = useMutation(api.mutations.deleteAttachment);
    const handleAttachmentDelete = useCallback(async (chunkId: string, attachmentId: Id<"attachments">) => {
        try {
            await deleteAttachmentMutation({ attachmentId });
            setChunkAttachments(prev => ({
                ...prev,
                [chunkId]: prev[chunkId]?.filter((a) => a._id !== attachmentId) || []
            }));
        } catch (error) {
            console.error("Failed to delete attachment:", error);
        }
    }, [deleteAttachmentMutation]);

    const handleConnectionsClick = useCallback((chunkId: string) => {
        setConnectionsModal({
            isOpen: true,
            chunkId: chunkId as Id<"chunks">,
        });
    }, []);

    const handleMoveClick = useCallback((chunkId: string) => {
        setMoveModal({
            isOpen: true,
            chunkId: chunkId as Id<"chunks">,
        });
    }, []);

    // Move to top handler
    const handleMoveToTop = useCallback(async (chunkId: string) => {
        try {
            await moveChunkToTop({ chunkId: chunkId as Id<"chunks"> });
        } catch (error) {
            console.error("Failed to move chunk to top:", error);
        }
    }, [moveChunkToTop]);

    // Move to bottom handler
    const handleMoveToBottom = useCallback(async (chunkId: string) => {
        try {
            await moveChunkToBottom({ chunkId: chunkId as Id<"chunks"> });
        } catch (error) {
            console.error("Failed to move chunk to bottom:", error);
        }
    }, [moveChunkToBottom]);

    // Minimize toggle handler
    const handleToggleMinimize = useCallback((chunkId: Id<"chunks">) => {
        setMinimizedChunks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chunkId)) {
                newSet.delete(chunkId);
            } else {
                newSet.add(chunkId);
            }

            // Save to localStorage
            if (typeof window !== 'undefined') {
                try {
                    const storageKey = `nexus-minimized-chunks-${notebookId}`;
                    localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
                } catch (error) {
                    console.warn('Failed to save minimized chunks to localStorage:', error);
                }
            }

            return newSet;
        });
    }, [notebookId]);

    // Add chunk handler
    const handleAddChunk = async () => {
        if (isSeedingMetaTags || selectedTagId) return;

        try {
            const newChunkId = await createChunk({
                notebookId,
                originalText: "",
                chunkType: "text",
                source: "User Input",
                placementHint: "add",
                // metaTagId intentionally omitted; server defaults to CORE
            });

            // Start editing the new chunk immediately with empty content
            setEditingChunkId(newChunkId);
            setEditContent("");
            setFocusChunkId(newChunkId);

            onChunkAdd?.();
        } catch (error) {
            console.error("Failed to create chunk:", error);
        }
    };

    // Show loading spinner if chunks are loading
    if (typedChunks === undefined || metaTags === undefined) {
        return (
            <div className={`flex flex-col items-center justify-center p-12 ${className}`}>
                <LargeLoadingSpinner size={48} color="#8b5cf6" className="mb-4" />
                <div className="text-gray-400 text-sm">Loading chunks...</div>
            </div>
        );
    }

    let overlayBorderColor = 'border-gray-700';
    if (activeChunk?.metaTag?.displayColor) {
        try {
            overlayBorderColor = getMetaTagColorClasses(activeChunk.metaTag.displayColor as MetaTagColor, 'border');
        } catch {
            overlayBorderColor = 'border-gray-700';
        }
    }

    return (
        <div className={`space-y-4 ${className} custom-scrollbar`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">
                        {selectedTagId ? "Chunks by Tag" : "Locus Data"}
                    </h3>
                    <div className="text-sm text-gray-400">
                        <span>{typedChunks.length} snippet{typedChunks.length !== 1 ? 's' : ''}</span>
                        {selectedTagId && (
                            <span className="ml-2 text-purple-400">
                                (filtered view - drag & drop disabled)
                            </span>
                        )}
                    </div>
                </div>
            <div className="flex items-center gap-2">
                    <button
                        onClick={handleAddChunk}
                        disabled={viewMode === "read" || isSeedingMetaTags || !!selectedTagId}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${isSeedingMetaTags || !!selectedTagId
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : viewMode === 'read' ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-br from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white'
                            }`}
                        title={
                            viewMode === 'read' ? 'Switch to Edit mode to add chunks' : (isSeedingMetaTags
                                ? "Initializing meta tags..."
                                : !!selectedTagId
                                    ? "Cannot add chunks when viewing by tag"
                                    : "Add a new chunk")
                        }
                    >
                        {isSeedingMetaTags ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        )}
                        {isSeedingMetaTags ? "Initializing..." : "Add Chunk"}
                    </button>
                </div>
            </div>

            {/* Chunks List with Drag and Drop */}
            <div className="relative">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    autoScroll={{ threshold: { x: 0, y: 0.2 }, acceleration: 15 }}
                >
                    <SortableContext
                        items={typedChunks?.map(chunk => chunk._id) || []}
                        strategy={verticalListSortingStrategy}
                        disabled={viewMode === "read"}
                    >
                        <div className="space-y-3 custom-scrollbar">
                            {(typedChunks || []).map((chunk) => {
                                const selectedTags = chunk.tags?.map(tag => tag._id) || [];
                                const attachments = chunkAttachments[chunk._id] || [];

                                return (
                                    <div key={chunk._id} id={`chunk-${chunk._id}`}>
                                        <MemoSortableChunk
                                            chunk={chunk}
                                            selectedTags={selectedTags}
                                            chunkAttachments={attachments}
                                            chunkConnections={chunkConnections[chunk._id] || 0}
                                            isEditing={editingChunkId === chunk._id}
                                            editContent={editContent}
                                            isUpdating={updatingChunkId === chunk._id}
                                            isDragDisabled={viewMode === "read" || !!selectedTagId}
                                            metaTags={metaTags || []}
                                            isMinimized={minimizedChunks.has(chunk._id)}
                                            viewMode={viewMode}
                                            onEdit={() => handleEditClick(chunk)}
                                            onSave={() => handleSaveEdit()}
                                            onCancel={handleCancelEdit}
                                            onDelete={() => handleDeleteClick(chunk._id)}
                                            onTagsClick={() => setTagsModal({ isOpen: true, chunkId: chunk._id })}
                                            onAttachmentsClick={() => handleAttachmentsClick(chunk._id)}
                                            onConnectionsClick={() => handleConnectionsClick(chunk._id)}
                                            onMoveToTop={() => handleMoveToTop(chunk._id)}
                                            onMoveToBottom={() => handleMoveToBottom(chunk._id)}
                                            onMoveToDifferentLocus={() => handleMoveClick(chunk._id)}
                                            onAttachmentDelete={(attachmentId) => handleAttachmentDelete(chunk._id, attachmentId)}
                                            onEditContentChange={setEditContent}
                                            onToggleMinimize={() => handleToggleMinimize(chunk._id)}
                                            textareaRef={(el) => {
                                                if (el) {
                                                    textareaRefs.current.set(chunk._id, el);
                                                }
                                            }}
                                            onNavigateToParent={onNavigateToNotebook}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeChunk ? (
                            <MinimizedChunk
                                chunk={activeChunk}
                                borderColor={overlayBorderColor}
                                onExpand={() => { }}
                                isDragging={true}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>

                {/* Navigation Arrows - only in read mode */}
                {viewMode === "read" && typeof pageData?.totalChunks === 'number' && pageData.totalChunks > 0 && (
                    <>
                        {/* Left Arrow */}
                        <button
                            className="absolute -left-10 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-20"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            aria-label="Previous page"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        {/* Right Arrow */}
                        <button
                            className="absolute -right-10 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-20"
                            onClick={() => {
                                const total = pageData?.totalChunks || 0;
                                const totalPages = Math.max(1, Math.ceil(total / pageSize));
                                setPage((p) => Math.min(totalPages, p + 1));
                            }}
                            disabled={(() => {
                                const total = pageData?.totalChunks || 0;
                                const totalPages = Math.max(1, Math.ceil(total / pageSize));
                                return page >= totalPages;
                            })()}
                            aria-label="Next page"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            {/* Empty State */}
            {typedChunks.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                        {selectedTagId ? "No chunks found with the selected tag" : "No chunks yet"}
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <InfoModal
                isOpen={deleteModal.isOpen}
                title="Delete Snippet"
                message={`Are you sure you want to delete this snippet?${deleteModal.chunkTitle ? ` "${deleteModal.chunkTitle}"` : ''} This action cannot be undone.`}
                cancelLabel="Cancel"
                confirmLabel="Delete"
                confirmVariant="danger"
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
            />

            {/* Chunk Tags Modal */}
            {tagsModal.isOpen && tagsModal.chunkId && nexusId && (
                <ChunkTagsModal
                    isOpen={tagsModal.isOpen}
                    onClose={() => setTagsModal({ isOpen: false, chunkId: null })}
                    chunkId={tagsModal.chunkId}
                    notebookId={notebookId}
                    nexusId={nexusId}
                />
            )}



            {/* Attachment Modal */}
            <AttachmentModal
                isOpen={attachmentModalOpen}
                onClose={() => setAttachmentModalOpen(false)}
                onSave={handleAttachmentSave}
            />

            {/* Connections Modal */}
            {connectionsModal.isOpen && connectionsModal.chunkId && (
                <ConnectionsModal
                    isOpen={connectionsModal.isOpen}
                    onClose={() => setConnectionsModal({ isOpen: false, chunkId: null })}
                    chunkId={connectionsModal.chunkId}
                    currentNotebookId={notebookId}
                />
            )}

            {/* Move Modal */}
            {moveModal.isOpen && moveModal.chunkId && (
                <MoveModal
                    isOpen={moveModal.isOpen}
                    onClose={() => setMoveModal({ isOpen: false, chunkId: null })}
                    chunkId={moveModal.chunkId}
                    currentNotebookId={notebookId}
                />
            )}

            {/* Pagination Controls - only in read mode */}
            {viewMode === "read" && typeof pageData?.totalChunks === 'number' && pageData.totalChunks > 0 && (
                <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex-1 flex flex-wrap items-center justify-center gap-2">
                        {Array.from({ length: Math.max(1, Math.ceil(((pageData?.totalChunks || 0) / pageSize))) }).map((_, i) => {
                            const pageNum = i + 1;
                            const isActive = pageNum === page;
                            return (
                                <button
                                    key={pageNum}
                                    className={`px-3 py-1 rounded text-sm ${isActive ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                                    onClick={() => setPage(pageNum)}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}