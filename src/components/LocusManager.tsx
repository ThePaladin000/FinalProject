"use client";

import { useState, useEffect, useCallback } from "react";
import { DocumentArrowUpIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import ContextMenu from "./ContextMenu";
import CustomModal, { ModalAction, ModalField } from "./CustomModal";
import InfoModal from "./InfoModal";
import { useAuth } from "@clerk/nextjs";
import { ChunkingService } from "../utils/chunking";

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

// Sortable locus component
interface SortableLocusProps {
    locus: {
        _id: Id<"notebooks">;
        name: string;
        description?: string;
        metaQuestion?: string;
        _locusPosition?: number;
    };
    isSelected: boolean;
    onSelect: () => void;
    onContextMenu: (event: React.MouseEvent) => void;
}

function SortableLocus({ locus, isSelected, onSelect, onContextMenu }: SortableLocusProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: locus._id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-gray-700 rounded-lg border border-gray-600 ${isSelected ? 'ring-2 ring-purple-500' : ''} ${isDragging ? 'z-50' : ''}`}
        >
            <div
                onClick={onSelect}
                onContextMenu={onContextMenu}
                className="p-4 cursor-pointer transition-all hover:bg-gray-600"
            >
                <div className="flex items-start justify-between mb-2">
                    <h4 className="text-md font-medium text-white">{locus.name}</h4>
                    {/* Drag handle */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="text-gray-400 hover:text-gray-200 transition-colors p-1 cursor-grab active:cursor-grabbing"
                        title="Drag to reorder"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                    </div>
                </div>
                {locus.description && (
                    <p className="text-gray-300 text-sm mb-2 line-clamp-2">{locus.description}</p>
                )}
                {locus.metaQuestion && (
                    <div className="text-xs text-purple-400 bg-purple-900/20 rounded px-2 py-1 inline-block">
                        Q: {locus.metaQuestion}
                    </div>
                )}
            </div>
        </div>
    );
}

interface LocusManagerProps {
    nexusId: Id<"nexi">;
    selectedLocusId?: Id<"notebooks">;
    onLocusSelected?: (locusId: Id<"notebooks">) => void;
    className?: string;
}

export default function LocusManager({
    nexusId,
    selectedLocusId,
    onLocusSelected,
    className = ""
}: LocusManagerProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [metaQuestion, setMetaQuestion] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [nameError, setNameError] = useState("");
    // Drag and drop state
    const [activeLocus, setActiveLocus] = useState<{
        _id: Id<"notebooks">;
        name: string;
        description?: string;
        metaQuestion?: string;
        _locusPosition?: number;
    } | null>(null);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        locusId: Id<"notebooks"> | null;
    }>({
        isOpen: false,
        position: { x: 0, y: 0 },
        locusId: null,
    });

    const { userId } = useAuth();
    const loci = useQuery(
        api.queries.getNotebooksByNexus,
        userId ? { nexusId, ownerId: userId } : { nexusId }
    );
    const metaTags = useQuery(api.queries.getMetaTags, userId ? { ownerId: userId } : {});
    const createLocus = useMutation(api.mutations.createNotebook);
    const updateLocus = useMutation(api.mutations.updateNotebook);
    const deleteLocus = useMutation(api.mutations.deleteNotebook);
    const seedMetaTags = useMutation(api.seed.seedMetaTags);
    const createTagMutation = useMutation(api.mutations.createTag);
    const assignTagsToChunk = useMutation(api.mutations.assignTagsToChunk);
    const reorderLoci = useMutation(api.mutations.reorderLocusContentItems);

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Allow a small movement before starting drag
            },
        })
    );

    // Import modal state
    const [importModal, setImportModal] = useState<{ isOpen: boolean; locusId: Id<"notebooks"> | null }>({
        isOpen: false,
        locusId: null,
    });
    const [isSubmittingImport, setIsSubmittingImport] = useState(false);

    // Info modal for post-import messages
    const [infoModal, setInfoModal] = useState<{ isOpen: boolean; title: string; message: string }>(
        { isOpen: false, title: "", message: "" }
    );

    // Get chunks and tags for the selected locus for export
    const selectedLocusChunks = useQuery(
        api.queries.getChunksByNotebook,
        contextMenu.locusId && userId ? { notebookId: contextMenu.locusId, ownerId: userId } : "skip"
    );
    const selectedLocusTags = useQuery(
        api.queries.getTagsByNotebook,
        contextMenu.locusId && userId ? { notebookId: contextMenu.locusId, ownerId: userId } : "skip"
    );

    const submitCreateLocus = useCallback(async () => {
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            const locusId = await createLocus({
                nexusId,
                name: name.trim(),
                description: description.trim() || undefined,
                metaQuestion: metaQuestion.trim() || undefined,
            });

            setName("");
            setDescription("");
            setMetaQuestion("");
            setNameError("");
            setIsCreating(false);
            onLocusSelected?.(locusId);
        } catch (error) {
            console.error("Failed to create locus:", error);
        } finally {
            setIsSubmitting(false);
        }
    }, [name, description, metaQuestion, nexusId, createLocus, onLocusSelected]);

    // Handle Ctrl+Enter to submit create locus form
    useEffect(() => {
        const handleCtrlEnter = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && event.ctrlKey && isCreating) {
                // Prevent default behavior
                event.preventDefault();

                // Check if name is provided
                if (!name.trim()) {
                    setNameError("Locus name is required");
                    return;
                }

                // Only submit if not currently loading
                if (!isSubmitting) {
                    submitCreateLocus();
                }
            }
        };

        if (isCreating) {
            document.addEventListener('keydown', handleCtrlEnter);
        }

        return () => {
            document.removeEventListener('keydown', handleCtrlEnter);
        };
    }, [isCreating, isSubmitting, name, description, metaQuestion, nexusId, createLocus, onLocusSelected, submitCreateLocus]);

    const handleCreateLocus = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitCreateLocus();
    };



    // Context menu handlers
    const handleContextMenu = (event: React.MouseEvent, locusId: Id<"notebooks">) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({
            isOpen: true,
            position: { x: event.clientX, y: event.clientY },
            locusId,
        });
    };

    const handleContextMenuClose = () => {
        setContextMenu({
            isOpen: false,
            position: { x: 0, y: 0 },
            locusId: null,
        });
    };

    const openImportForSelected = () => {
        if (!contextMenu.locusId) return;
        setImportModal({ isOpen: true, locusId: contextMenu.locusId });
        handleContextMenuClose();
    };

    // Modal state for editing loci
    const [editModal, setEditModal] = useState<{
        isOpen: boolean;
        locus: { name: string; description?: string; metaQuestion?: string; _id: Id<"notebooks"> } | null;
    }>({
        isOpen: false,
        locus: null,
    });

    const handleEditLocus = async () => {
        if (!contextMenu.locusId) return;

        const locus = loci?.find(n => n._id === contextMenu.locusId);
        if (!locus) return;

        setEditModal({
            isOpen: true,
            locus: {
                _id: locus._id,
                name: locus.name,
                description: locus.description,
                metaQuestion: locus.metaQuestion,
            },
        });
    };

    const handleEditModalClose = () => {
        setEditModal({ isOpen: false, locus: null });
    };

    const handleEditModalSubmit = async (data: Record<string, string>) => {
        if (!editModal.locus) return;

        try {
            await updateLocus({
                notebookId: editModal.locus._id,
                name: data.name?.trim(),
                description: data.description?.trim() || undefined,
                metaQuestion: data.metaQuestion?.trim() || undefined,
            });
            handleEditModalClose();
        } catch (error) {
            console.error('Failed to update locus:', error);
            alert('Failed to update locus');
        }
    };

    const handleExportLocus = async () => {
        if (!contextMenu.locusId) return;

        const locus = loci?.find(n => n._id === contextMenu.locusId);
        if (!locus) return;

        try {
            // Compile all data for this locus
            const locusData = {
                locus: {
                    _id: locus._id,
                    name: locus.name,
                    description: locus.description,
                    metaQuestion: locus.metaQuestion,
                    nexusId: locus.nexusId,
                    createdAt: locus.createdAt,
                    updatedAt: locus.updatedAt,
                },
                chunks: selectedLocusChunks || [],
                tags: selectedLocusTags || [],
                exportInfo: {
                    exportedAt: typeof window !== 'undefined' ? new Date().toISOString() : '',
                    totalChunks: selectedLocusChunks?.length || 0,
                    totalTags: selectedLocusTags?.length || 0,
                }
            };

            // Create and download JSON file
            const dataStr = JSON.stringify(locusData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${locus.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export locus:', error);
            alert('Failed to export locus');
        }
    };

    // Delete confirmation modal state
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        locusId: Id<"notebooks"> | null;
        locusName: string;
    }>({ isOpen: false, locusId: null, locusName: "" });

    const handleDeleteLocus = () => {
        if (!contextMenu.locusId) return;

        const locus = loci?.find(n => n._id === contextMenu.locusId);
        if (!locus) return;

        setDeleteModal({ isOpen: true, locusId: locus._id, locusName: locus.name });
    };

    // Resolve selected locus for import modal title
    const selectedLocusForImport = importModal.locusId ? loci?.find(n => n._id === importModal.locusId) : null;

    const importFields: ModalField[] = [
        {
            name: "format",
            label: "Input Type",
            type: "select",
            options: [
                { value: "raw", label: "Raw text" },
                { value: "json", label: "JSON" },
            ],
            defaultValue: "raw",
        },
        {
            name: "data",
            label: "Data to Import",
            type: "textarea",
            placeholder: (formData) =>
                (formData["format"] || "raw") === "json"
                    ? "Paste exported locus JSON here"
                    : "Paste raw text here...",
            required: true,
            maxLength: 200000,
            defaultValue: "",
        },
    ];

    const importActions: ModalAction[] = [
        { label: "Cancel", onClick: () => setImportModal({ isOpen: false, locusId: null }), variant: "secondary" },
        { label: "Import", onClick: () => {}, variant: "primary", disabled: isSubmittingImport },
    ];

    const handleImportSubmit = async (data: Record<string, string>) => {
        if (!importModal.locusId) return;
        const inputType = (data.format || "raw").toLowerCase();
        const raw = (data.data || "").trim();
        if (!raw) return;

        // Helper to create a chunk via Next.js API (ensures server auth)
        const createChunk = async (args: {
            locusId: string;
            title?: string;
            originalText: string;
            userEditedText?: string;
            source?: string;
            chunkType?: "text" | "code" | "document";
            metaTagId?: string;
        }): Promise<string | null> => {
            try {
                const res = await fetch("/api/chunks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(args),
                });
                if (!res.ok) throw new Error(await res.text());
                const json = await res.json();
                return json.chunkId as string;
            } catch (e) {
                console.error("Create chunk failed:", e);
                return null;
            }
        };

        setIsSubmittingImport(true);
        try {
            let createdCount = 0;

            if (inputType === "raw") {
                const text = raw;
                try {
                    // Use the shared chunking mechanism to split the input into meaningful chunks
                    const chunkingResult = ChunkingService.chunkResponse(text, "import", "user");

                    if (chunkingResult.chunks.length === 0) {
                        // Fallback: ensure at least one chunk is created
                        const chunkId = await createChunk({
                            locusId: importModal.locusId,
                            originalText: text,
                            source: "import",
                            chunkType: "text",
                        });
                        createdCount += chunkId ? 1 : 0;
                    } else {
                        for (const ch of chunkingResult.chunks) {
                            const chunkId = await createChunk({
                                locusId: importModal.locusId,
                                originalText: ch.content,
                                source: "import",
                                chunkType: ch.chunkType,
                            });
                            if (chunkId) createdCount++;
                        }
                    }
                } catch {
                    // Absolute fallback in case chunking throws unexpectedly
                    const chunkId = await createChunk({
                        locusId: importModal.locusId,
                        originalText: text,
                        source: "import",
                        chunkType: "text",
                    });
                    createdCount += chunkId ? 1 : 0;
                }
            } else {
                // JSON mode: accept exported locus format or arrays/objects of chunks
                let parsed: unknown;
                try {
                    parsed = JSON.parse(raw);
                } catch {
                    throw new Error("Invalid JSON provided");
                }

                // Normalize to an array of chunk-like inputs
                let chunkInputs: unknown[] = [];
                let tagCatalog: unknown[] = [];

                if (Array.isArray(parsed)) {
                    chunkInputs = parsed;
                } else if (parsed && typeof parsed === "object") {
                    const obj = parsed as {
                        chunks?: unknown[];
                        items?: unknown[];
                        text?: unknown;
                        content?: unknown;
                        tags?: unknown[];
                    };
                    if (Array.isArray(obj.chunks)) {
                        chunkInputs = obj.chunks;
                    } else if (Array.isArray(obj.items)) {
                        chunkInputs = obj.items;
                    } else if (obj.text !== undefined || obj.content !== undefined) {
                        chunkInputs = [obj];
                    } else {
                        throw new Error("Unrecognized JSON structure");
                    }
                    if (Array.isArray(obj.tags)) {
                        tagCatalog = obj.tags;
                    }
                } else if (typeof parsed === "string") {
                    chunkInputs = [parsed];
                } else {
                    throw new Error("Unsupported JSON format");
                }

                // Create tags first if provided in export; dedupe by name
                const tagNameToId = new Map<string, string>();
                for (const tagItem of tagCatalog) {
                    let name: string | undefined;
                    let description: string | undefined;
                    let color: string | undefined;
                    if (typeof tagItem === "string") {
                        name = tagItem;
                    } else if (tagItem && typeof tagItem === "object") {
                        const t = tagItem as { name?: string; description?: string; color?: string };
                        name = t.name;
                        description = t.description;
                        color = t.color;
                    } else {
                        continue;
                    }
                    if (!name || tagNameToId.has(name)) continue;
                    try {
                        const newTagId = await createTagMutation({
                            notebookId: importModal.locusId,
                            name,
                            description,
                            parentTagId: undefined,
                            color,
                        });
                        if (newTagId) tagNameToId.set(name, newTagId as unknown as string);
                    } catch (e) {
                        console.warn("Failed creating tag", name, e);
                    }
                }

                // Process chunks
                for (const item of chunkInputs) {
                    if (typeof item === "string") {
                        const text = item;
                        const title = text.length > 80 ? text.slice(0, 80) + "…" : text;
                        const chunkId = await createChunk({
                            locusId: importModal.locusId,
                            title,
                            originalText: text,
                            source: "import",
                            chunkType: "text",
                        });
                        if (chunkId) createdCount++;
                        continue;
                    }

                    // Item is an object, try common fields
                    const obj = item as {
                        userEditedText?: string;
                        originalText?: string;
                        text?: string;
                        content?: string;
                        chunkType?: "text" | "code" | "document";
                        source?: string;
                        tags?: Array<string | { name?: string; description?: string; color?: string }>;
                    };
                    const text: string | undefined = obj.userEditedText || obj.originalText || obj.text || obj.content;
                    const chunkType: "text" | "code" | "document" =
                        obj.chunkType === "code" || obj.chunkType === "document" ? obj.chunkType : "text";
                    if (!text) continue;

                    const chunkId = await createChunk({
                        locusId: importModal.locusId,
                        originalText: text,
                        userEditedText: obj.userEditedText,
                        source: obj.source || "import",
                        chunkType,
                    });
                    if (chunkId) {
                        createdCount++;

                        // Assign tags if present on item
                        const itemTags: Array<string | { name?: string; description?: string; color?: string }> =
                            Array.isArray(obj.tags) ? obj.tags : [];
                        if (itemTags.length > 0) {
                            const tagIds: string[] = [];
                            for (const t of itemTags) {
                                const name: string | undefined =
                                    typeof t === "string"
                                        ? t
                                        : (typeof t === "object" && t ? (t as { name?: string }).name : undefined);
                                if (!name) continue;
                                let id = tagNameToId.get(name);
                                if (!id) {
                                    try {
                                        const newTagId = await createTagMutation({
                                            notebookId: importModal.locusId,
                                            name,
                                            description:
                                                typeof t === "object" && t
                                                    ? (t as { description?: string }).description
                                                    : undefined,
                                            parentTagId: undefined,
                                            color:
                                                typeof t === "object" && t
                                                    ? (t as { color?: string }).color
                                                    : undefined,
                                        });
                                        id = newTagId as unknown as string;
                                        if (id) tagNameToId.set(name, id);
                                    } catch (e) {
                                        console.warn("Failed creating tag", name, e);
                                    }
                                }
                                if (id) tagIds.push(id as unknown as string);
                            }
                            if (tagIds.length > 0) {
                                try {
                                    await assignTagsToChunk({
                                        chunkId: chunkId as unknown as Id<"chunks">,
                                        tagIds: tagIds as unknown as Id<"tags">[],
                                    });
                                } catch (e) {
                                    console.warn("Failed assigning tags to chunk", chunkId, e);
                                }
                            }
                        }
                    }
                }
            }

            // Show success message first, then close import modal when user acknowledges
            setInfoModal({
                isOpen: true,
                title: "Import Complete",
                message: `Imported ${createdCount} chunk${createdCount === 1 ? "" : "s"}.`
            });
        } catch (error) {
            console.error("Failed to import data:", error);
            setInfoModal({
                isOpen: true,
                title: "Import Failed",
                message: error instanceof Error ? error.message : "Failed to import data"
            });
        } finally {
            setIsSubmittingImport(false);
        }
    };

    // Drag and drop handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        if (loci) {
            const locus = loci.find(l => l._id === event.active.id);
            if (locus) {
                setActiveLocus(locus);
            }
        }
    }, [loci]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveLocus(null);

        if (!over || active.id === over.id) {
            return;
        }

        if (!loci) {
            return;
        }

        const oldIndex = loci.findIndex((locus) => locus._id === active.id);
        const newIndex = loci.findIndex((locus) => locus._id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            // Create the new order by moving the locus
            const newLoci = [...loci];
            const [movedLocus] = newLoci.splice(oldIndex, 1);
            newLoci.splice(newIndex, 0, movedLocus);

            // Extract just the IDs in the new order
            const newOrder = newLoci.map(locus => locus._id);

            try {
                await reorderLoci({
                    locusId: nexusId,
                    contentType: "notebook",
                    itemIds: newOrder,
                    parentId: undefined,
                });
            } catch (error) {
                console.error("Failed to reorder loci:", error);
            }
        }
    }, [loci, reorderLoci, nexusId]);

    if (!loci) {
        return (
            <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-700 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Your Loci</h3>
                <div className="flex items-center gap-2">
                    {(!metaTags || metaTags.length === 0) && (
                        <button
                            onClick={async () => {
                                try {
                                    await seedMetaTags();
                                    console.log("Meta tags seeded successfully");
                                } catch (error) {
                                    console.error("Failed to seed meta tags:", error);
                                }
                            }}
                            className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                            Initialize Meta Tags
                        </button>
                    )}
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white px-3 py-1 rounded text-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        Create Locus
                    </button>
                </div>
            </div>

            {isCreating ? (
                <div className="bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-white">Create New Locus</h4>
                        <button
                            onClick={() => {
                                setIsCreating(false);
                                setName("");
                                setDescription("");
                                setMetaQuestion("");
                                setNameError("");
                            }}
                            className="text-gray-400 hover:text-white"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleCreateLocus} className="space-y-3">
                        <div>
                            <label htmlFor="locus-name" className="block text-sm font-medium text-gray-300 mb-1">
                                Locus Name *
                            </label>
                            <input
                                id="locus-name"
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    // Clear error when user starts typing
                                    if (nameError) {
                                        setNameError("");
                                    }
                                }}
                                placeholder="Enter a descriptive name for your locus..."
                                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                required
                            />
                            {nameError && (
                                <p className="text-red-400 text-sm mt-1">{nameError}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="locus-description" className="block text-sm font-medium text-gray-300 mb-1">
                                Description (Optional)
                            </label>
                            <textarea
                                id="locus-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional: Describe the purpose and scope of this locus..."
                                rows={2}
                                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                            />
                        </div>

                        <div>
                            <label htmlFor="locus-meta-question" className="block text-sm font-medium text-gray-300 mb-1">
                                Meta Question (Optional)
                            </label>
                            <textarea
                                id="locus-meta-question"
                                value={metaQuestion}
                                onChange={(e) => setMetaQuestion(e.target.value)}
                                placeholder="Optional: What overarching question or theme does this locus address?"
                                rows={2}
                                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting || !name.trim()}
                                className="flex-1 bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded text-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                {isSubmitting ? "Creating..." : "Create Locus"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreating(false);
                                    setName("");
                                    setDescription("");
                                    setMetaQuestion("");
                                    setNameError("");
                                }}
                                className="px-3 py-2 text-gray-400 hover:text-white font-medium rounded text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}

            <div className="space-y-3">
                {loci.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        <div className="text-lg font-medium mb-2">No loci yet</div>
                        <div className="text-sm">Create your first locus to get started</div>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                        onDragStart={handleDragStart}
                    >
                        <SortableContext
                            items={loci.map(locus => locus._id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {loci.map((locus) => (
                                <SortableLocus
                                    key={locus._id}
                                    locus={locus}
                                    isSelected={selectedLocusId === locus._id}
                                    onSelect={() => onLocusSelected?.(locus._id)}
                                    onContextMenu={(e) => handleContextMenu(e, locus._id)}
                                />
                            ))}
                        </SortableContext>
                        <DragOverlay>
                            {activeLocus ? (
                                <SortableLocus
                                    locus={activeLocus}
                                    isSelected={false}
                                    onSelect={() => onLocusSelected?.(activeLocus._id)}
                                    onContextMenu={(e) => handleContextMenu(e, activeLocus._id)}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>

            {/* Context Menu */}
            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                onClose={handleContextMenuClose}
                items={[
                    {
                        label: "Edit",
                        icon: (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        ),
                        onClick: handleEditLocus,
                    },
                    {
                        label: "Import",
                        icon: (
                            <DocumentArrowUpIcon className="w-4 h-4" />
                        ),
                        onClick: openImportForSelected,
                    },
                    {
                        label: "Export",
                        icon: (
                            <ArrowDownTrayIcon className="w-4 h-4" />
                        ),
                        onClick: handleExportLocus,
                    },
                    {
                        label: "Delete",
                        icon: (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        ),
                        onClick: handleDeleteLocus,
                        danger: true,
                    },
                ]}
            />

            {/* Edit Locus Modal */}
            {editModal.isOpen && editModal.locus && (
                <CustomModal
                    isOpen={editModal.isOpen}
                    onClose={handleEditModalClose}
                    title="Edit Locus"
                    fields={[
                        {
                            name: "name",
                            label: "Locus Name",
                            type: "text",
                            placeholder: "Enter locus name...",
                            required: true,
                            defaultValue: editModal.locus.name,
                            maxLength: 100,
                        },
                        {
                            name: "description",
                            label: "Description",
                            type: "textarea",
                            placeholder: "Describe what this locus is about...",
                            defaultValue: editModal.locus.description || "",
                            maxLength: 500,
                        },
                        {
                            name: "metaQuestion",
                            label: "Meta Question",
                            type: "textarea",
                            placeholder: "What overarching question does this locus address?",
                            defaultValue: editModal.locus.metaQuestion || "",
                            maxLength: 300,
                        },
                    ]}
                    actions={[
                        {
                            label: "Cancel",
                            onClick: handleEditModalClose,
                            variant: "secondary",
                        },
                        {
                            label: "Update Locus",
                            onClick: () => { },
                            variant: "primary",
                        },
                    ]}
                    onSubmit={handleEditModalSubmit}
                />
            )}

            {/* Import Modal */}
            <CustomModal
                isOpen={importModal.isOpen}
                onClose={() => setImportModal({ isOpen: false, locusId: null })}
                title={selectedLocusForImport ? `Import into "${selectedLocusForImport.name}"` : "Import Data"}
                fields={importFields}
                actions={importActions}
                onSubmit={handleImportSubmit}
                loading={isSubmittingImport}
            />

            {/* Info Modal */}
            <InfoModal
                isOpen={infoModal.isOpen}
                title={infoModal.title}
                message={infoModal.message}
                confirmLabel="Ok"
                onClose={() => {
                    setInfoModal({ isOpen: false, title: "", message: "" });
                    // If this was an import success message, also close the import modal
                    if (infoModal.title === "Import Complete") {
                        setImportModal({ isOpen: false, locusId: null });
                    }
                }}
            />

            {/* Delete Confirmation Modal */}
            <InfoModal
                isOpen={deleteModal.isOpen}
                title="Delete Locus"
                message={`Are you sure you want to delete "${deleteModal.locusName}"? This action cannot be undone and will delete all associated chunks, tags, and conversations.`}
                cancelLabel="Cancel"
                confirmLabel="Delete"
                confirmVariant="danger"
                onClose={() => setDeleteModal({ isOpen: false, locusId: null, locusName: "" })}
                onConfirm={async () => {
                    if (!deleteModal.locusId) return;
                    try {
                        await deleteLocus({ notebookId: deleteModal.locusId });
                        setDeleteModal({ isOpen: false, locusId: null, locusName: "" });
                        if (selectedLocusId === deleteModal.locusId) {
                            // Parent can clear selection when the locus disappears
                        }
                    } catch (error) {
                        console.error('Failed to delete locus:', error);
                        setDeleteModal({ isOpen: false, locusId: null, locusName: "" });
                        setInfoModal({ isOpen: true, title: 'Delete Failed', message: 'Failed to delete locus' });
                    }
                }}
            />
        </div>
    );
}

// Separate component for displaying chunks
