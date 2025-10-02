"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import ContextMenu from "./ContextMenu";
import CustomModal, { ModalAction, ModalField } from "./CustomModal";
import InfoModal from "./InfoModal";
import { DocumentArrowUpIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { ChunkingService } from "../utils/chunking";

interface TreeNodeProps {
    id: string;
    name: string;
    description?: string;
    children?: React.ReactNode;
    level: number;
    isExpanded: boolean;
    onToggle: () => void;
    isSelected?: boolean;
    onSelect?: () => void;
    type: "nexus" | "notebook" | "tag" | "childTag";
    onContextMenu?: (e: React.MouseEvent) => void;
}

function TreeNode({
    name,
    children,
    level,
    isExpanded,
    onToggle,
    isSelected = false,
    onSelect,
    type,
    onContextMenu,
}: TreeNodeProps) {
    const indent = level * 16;

    return (
        <div>
            <div
                className={`flex items-center py-1 px-2 cursor-pointer transition-colors rounded-md ${
                    isSelected
                        ? (type === "tag" || type === "childTag")
                            ? "bg-green-900/30 text-green-300 border border-green-500/40"
                            : type === "notebook"
                                ? "bg-blue-900/30 text-blue-300 border border-blue-500/40"
                                : "bg-purple-900/30 text-purple-300 border border-purple-500/40"
                        : "text-gray-300 hover:bg-gray-700"
                }`}
                style={{ paddingLeft: `${indent + 8}px` }}
                onClick={onSelect}
                onContextMenu={onContextMenu}
            >
                {children && React.Children.count(children) > 0 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        className="mr-2 text-gray-400 hover:text-white transition-colors"
                    >
                        {isExpanded ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        )}
                    </button>
                )}
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{name}</div>
                </div>
                {/* Add icon based on type */}
                <div className="ml-2">
                    {type === "nexus" && (
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    )}
                    {type === "notebook" && (
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    )}
                    {type === "tag" && (
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                    )}
                </div>
            </div>
            {isExpanded && children && React.Children.count(children) > 0 && (
                <div className="ml-4">{children}</div>
            )}
        </div>
    );
}

interface TreeViewProps {
    onNexusSelected?: (nexusId: Id<"nexi">) => void;
    onLocusSelected?: (locusId: Id<"notebooks">) => void;
    onTagSelected?: (tagId: Id<"tags">) => void;
    selectedNexusId?: Id<"nexi"> | null;
    selectedLocusId?: Id<"notebooks"> | undefined;
    selectedTagId?: Id<"tags"> | null;

}

export default function TreeView({
    onNexusSelected,
    onLocusSelected,
    onTagSelected,
    selectedNexusId,
    selectedLocusId,
    selectedTagId
}: TreeViewProps) {
    const router = useRouter();
    const [expandedNexi, setExpandedNexi] = useState<Set<string>>(new Set());
    const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set());
    const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

    const { userId } = useAuth();
    const treeData = useQuery(api.queries.getCompleteTree, userId ? { ownerId: userId } : "skip");

    // Mutations for editing/deleting
    const updateNexus = useMutation(api.mutations.updateNexus);
    const deleteNexus = useMutation(api.mutations.deleteNexus);
    const updateLocus = useMutation(api.mutations.updateNotebook);
    const deleteLocus = useMutation(api.mutations.deleteNotebook);
    const createTagMutation = useMutation(api.mutations.createTag);
    const assignTagsToChunk = useMutation(api.mutations.assignTagsToChunk);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        type: "nexus" | "locus" | null;
        nexusId: Id<"nexi"> | null;
        locusId: Id<"notebooks"> | null;
    }>({ isOpen: false, position: { x: 0, y: 0 }, type: null, nexusId: null, locusId: null });

    const openNexusMenu = (e: React.MouseEvent, nexusId: Id<"nexi">) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, type: "nexus", nexusId, locusId: null });
    };
    const openLocusMenu = (e: React.MouseEvent, locusId: Id<"notebooks">) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, type: "locus", nexusId: null, locusId });
    };
    const closeContextMenu = () => setContextMenu((prev) => ({ ...prev, isOpen: false }));

    // Nexus edit modal state
    const [nexusEditModal, setNexusEditModal] = useState<{ isOpen: boolean; nexusId: Id<"nexi"> | null }>({ isOpen: false, nexusId: null });
    const [isSubmittingNexusEdit, setIsSubmittingNexusEdit] = useState(false);

    // Resolve selected nexus for modal default values
    const selectedNexus = (() => {
        if (!treeData || !nexusEditModal.nexusId) return null;
        return treeData.find((n) => n._id === nexusEditModal.nexusId) || null;
    })();

    const nexusEditFields: ModalField[] = [
        { name: "name", label: "Nexus Name", type: "text", placeholder: "Enter nexus name...", required: true, maxLength: 100, defaultValue: selectedNexus?.name || "" },
        { name: "description", label: "Description", type: "textarea", placeholder: "Describe what this nexus is about...", maxLength: 500, defaultValue: selectedNexus?.description || "" },
    ];
    const nexusEditActions: ModalAction[] = [
        { label: "Cancel", onClick: () => setNexusEditModal({ isOpen: false, nexusId: null }), variant: "secondary" },
        { label: "Save Changes", onClick: () => {}, variant: "primary", disabled: isSubmittingNexusEdit },
    ];
    const handleNexusEditSubmit = async (data: Record<string, string>) => {
        if (!nexusEditModal.nexusId) return;
        const name = (data.name || "").trim();
        const description = (data.description || "").trim();
        if (!name) return;
        setIsSubmittingNexusEdit(true);
        try {
            await updateNexus({ nexusId: nexusEditModal.nexusId, name, description: description || undefined });
            setNexusEditModal({ isOpen: false, nexusId: null });
        } finally {
            setIsSubmittingNexusEdit(false);
        }
    };

    // Nexus delete confirm
    const [nexusDeleteModal, setNexusDeleteModal] = useState<{ isOpen: boolean; nexusId: Id<"nexi"> | null; nexusName: string }>({ isOpen: false, nexusId: null, nexusName: "" });

    // Locus edit modal state
    const [locusEditModal, setLocusEditModal] = useState<{
        isOpen: boolean;
        locus: { _id: Id<"notebooks">; name: string; description?: string; metaQuestion?: string } | null;
    }>({ isOpen: false, locus: null });

    const handleOpenLocusEdit = () => {
        if (!contextMenu.locusId || !treeData) return;
        for (const nexus of treeData) {
            const locus = (nexus.notebooks || []).find((nb: { _id: Id<"notebooks">; name: string; description?: string; metaQuestion?: string }) => nb._id === contextMenu.locusId);
            if (locus) {
                setLocusEditModal({ isOpen: true, locus: { _id: locus._id, name: locus.name, description: locus.description, metaQuestion: locus.metaQuestion } });
                break;
            }
        }
        closeContextMenu();
    };
    const handleLocusEditSubmit = async (data: Record<string, string>) => {
        if (!locusEditModal.locus) return;
        await updateLocus({ notebookId: locusEditModal.locus._id, name: data.name?.trim(), description: data.description?.trim() || undefined, metaQuestion: data.metaQuestion?.trim() || undefined });
        setLocusEditModal({ isOpen: false, locus: null });
    };

    // Locus import/export
    const [importModal, setImportModal] = useState<{ isOpen: boolean; locusId: Id<"notebooks"> | null }>({ isOpen: false, locusId: null });
    const [infoModal, setInfoModal] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: "", message: "" });
    const [isSubmittingImport, setIsSubmittingImport] = useState(false);

    const selectedLocusForImport = (() => {
        if (!importModal.locusId || !treeData) return null;
        for (const nx of treeData) {
            const locus = nx.notebooks?.find((n: { _id: Id<"notebooks">; name: string; description?: string; metaQuestion?: string }) => n._id === importModal.locusId);
            if (locus) return locus;
        }
        return null;
    })();

    const selectedLocusChunks = useQuery(
        api.queries.getChunksByNotebook,
        contextMenu.type === "locus" && contextMenu.locusId && userId ? { notebookId: contextMenu.locusId, ownerId: userId } : "skip"
    );
    const selectedLocusTags = useQuery(
        api.queries.getTagsByNotebook,
        contextMenu.type === "locus" && contextMenu.locusId && userId ? { notebookId: contextMenu.locusId, ownerId: userId } : "skip"
    );

    const importFields: ModalField[] = [
        { name: "format", label: "Input Type", type: "select", options: [{ value: "raw", label: "Raw text" }, { value: "json", label: "JSON" }], defaultValue: "raw" },
        { name: "data", label: "Data to Import", type: "textarea", placeholder: (formData) => ((formData["format"] || "raw") === "json" ? "Paste exported locus JSON here" : "Paste raw text here..."), required: true, maxLength: 200000, defaultValue: "" },
    ];
    const importActions: ModalAction[] = [
        { label: "Cancel", onClick: () => setImportModal({ isOpen: false, locusId: null }), variant: "secondary" },
        { label: "Import", onClick: () => {}, variant: "primary", disabled: isSubmittingImport },
    ];

    const openImportForSelected = () => {
        if (!contextMenu.locusId) return;
        setImportModal({ isOpen: true, locusId: contextMenu.locusId });
        closeContextMenu();
    };

    const handleImportSubmit = async (data: Record<string, string>) => {
        if (!importModal.locusId) return;
        const inputType = (data.format || "raw").toLowerCase();
        const raw = (data.data || "").trim();
        if (!raw) return;

        const createChunk = async (args: { locusId: string; title?: string; originalText: string; userEditedText?: string; source?: string; chunkType?: "text" | "code" | "document"; metaTagId?: string; }): Promise<string | null> => {
            try {
                const res = await fetch("/api/chunks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
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
                    const chunkingResult = ChunkingService.chunkResponse(text, "import", "user");
                    if (chunkingResult.chunks.length === 0) {
                        const chunkId = await createChunk({ locusId: importModal.locusId, originalText: text, source: "import", chunkType: "text" });
                        createdCount += chunkId ? 1 : 0;
                    } else {
                        for (const ch of chunkingResult.chunks) {
                            const chunkId = await createChunk({ locusId: importModal.locusId, originalText: ch.content, source: "import", chunkType: ch.chunkType });
                            if (chunkId) createdCount++;
                        }
                    }
                } catch {
                    const chunkId = await createChunk({ locusId: importModal.locusId, originalText: text, source: "import", chunkType: "text" });
                    createdCount += chunkId ? 1 : 0;
                }
            } else {
                let parsed: unknown;
                try {
                    parsed = JSON.parse(raw);
                } catch {
                    throw new Error("Invalid JSON provided");
                }
                let chunkInputs: unknown[] = [];
                let tagCatalog: unknown[] = [];
                if (Array.isArray(parsed)) {
                    chunkInputs = parsed;
                } else if (parsed && typeof parsed === "object") {
                    const obj = parsed as { chunks?: unknown[]; items?: unknown[]; text?: unknown; content?: unknown; tags?: unknown[] };
                    if (Array.isArray(obj.chunks)) chunkInputs = obj.chunks;
                    else if (Array.isArray(obj.items)) chunkInputs = obj.items;
                    else if (obj.text !== undefined || obj.content !== undefined) chunkInputs = [obj];
                    else throw new Error("Unrecognized JSON structure");
                    if (Array.isArray(obj.tags)) tagCatalog = obj.tags;
                } else if (typeof parsed === "string") {
                    chunkInputs = [parsed];
                } else {
                    throw new Error("Unsupported JSON format");
                }

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
                        const newTagId = await createTagMutation({ notebookId: importModal.locusId, name, description, parentTagId: undefined, color });
                        if (newTagId) tagNameToId.set(name, newTagId as unknown as string);
                    } catch (e) {
                        console.warn("Failed creating tag", name, e);
                    }
                }

                for (const item of chunkInputs) {
                    if (typeof item === "string") {
                        const text = item;
                        const title = text.length > 80 ? text.slice(0, 80) + "…" : text;
                        const chunkId = await createChunk({ locusId: importModal.locusId, title, originalText: text, source: "import", chunkType: "text" });
                        if (chunkId) createdCount++;
                        continue;
                    }
                    const obj = item as { userEditedText?: string; originalText?: string; text?: string; content?: string; chunkType?: "text" | "code" | "document"; source?: string; tags?: Array<string | { name?: string; description?: string; color?: string }>; };
                    const text: string | undefined = obj.userEditedText || obj.originalText || obj.text || obj.content;
                    const chunkType: "text" | "code" | "document" = obj.chunkType === "code" || obj.chunkType === "document" ? obj.chunkType : "text";
                    if (!text) continue;
                    const chunkId = await createChunk({ locusId: importModal.locusId, originalText: text, userEditedText: obj.userEditedText, source: obj.source || "import", chunkType });
                    if (chunkId) {
                        createdCount++;
                        const itemTags: Array<string | { name?: string; description?: string; color?: string }> = Array.isArray(obj.tags) ? obj.tags : [];
                        if (itemTags.length > 0) {
                            const tagIds: string[] = [];
                            for (const t of itemTags) {
                                const name: string | undefined = typeof t === "string" ? t : (typeof t === "object" && t ? (t as { name?: string }).name : undefined);
                                if (!name) continue;
                                let id = tagNameToId.get(name);
                                if (!id) {
                                    try {
                                        const newTagId = await createTagMutation({ notebookId: importModal.locusId, name, description: typeof t === "object" && t ? (t as { description?: string }).description : undefined, parentTagId: undefined, color: typeof t === "object" && t ? (t as { color?: string }).color : undefined });
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
                                    await assignTagsToChunk({ chunkId: chunkId as unknown as Id<"chunks">, tagIds: tagIds as unknown as Id<"tags">[] });
                                } catch (e) {
                                    console.warn("Failed assigning tags to chunk", chunkId, e);
                                }
                            }
                        }
                    }
                }
            }

            setImportModal({ isOpen: false, locusId: null });
            setInfoModal({ isOpen: true, title: "Import Complete", message: `Imported ${createdCount} chunk${createdCount === 1 ? "" : "s"}.` });
        } catch (error) {
            console.error("Failed to import data:", error);
            setInfoModal({ isOpen: true, title: "Import Failed", message: error instanceof Error ? error.message : "Failed to import data" });
        } finally {
            setIsSubmittingImport(false);
        }
    };

    const handleExportLocus = async () => {
        if (!contextMenu.locusId || !treeData) return;
        // Find the locus name
        let locusName = "locus";
        for (const nexus of treeData) {
            const locus = nexus.notebooks?.find((n: { _id: Id<"notebooks">; name: string; description?: string; metaQuestion?: string }) => n._id === contextMenu.locusId);
            if (locus) {
                locusName = locus.name;
                break;
            }
        }
        try {
            const locusData = {
                locus: { _id: contextMenu.locusId, name: locusName },
                chunks: selectedLocusChunks || [],
                tags: selectedLocusTags || [],
                exportInfo: { exportedAt: typeof window !== "undefined" ? new Date().toISOString() : "", totalChunks: selectedLocusChunks?.length || 0, totalTags: selectedLocusTags?.length || 0 },
            };
            const dataStr = JSON.stringify(locusData, null, 2);
            const dataBlob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${locusName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_export.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Failed to export locus:", e);
            setInfoModal({ isOpen: true, title: "Export Failed", message: "Could not export the selected locus." });
        }
    };

    // Locus delete confirm
    const [locusDeleteModal, setLocusDeleteModal] = useState<{ isOpen: boolean; locusId: Id<"notebooks"> | null; locusName: string }>({ isOpen: false, locusId: null, locusName: "" });

    const openLocusDeleteConfirm = () => {
        if (!contextMenu.locusId || !treeData) return;
        for (const nx of treeData) {
            const locus = nx.notebooks?.find((n: { _id: Id<"notebooks">; name: string; description?: string; metaQuestion?: string }) => n._id === contextMenu.locusId);
            if (locus) {
                setLocusDeleteModal({ isOpen: true, locusId: locus._id, locusName: locus.name });
                break;
            }
        }
        closeContextMenu();
    };

    // Auto-expand nexus when a locus is selected
    useEffect(() => {
        if (selectedLocusId && treeData) {
            for (const nexus of treeData) {
                if (nexus.notebooks?.some((nb: { _id: Id<"notebooks">; name: string; description?: string; metaQuestion?: string }) => nb._id === selectedLocusId)) {
                    setExpandedNexi(prev => new Set([...prev, nexus._id]));
                    break;
                }
            }
        }
    }, [selectedLocusId, treeData]);

    const toggleNexus = (nexusId: string) => {
        const newExpanded = new Set(expandedNexi);
        if (newExpanded.has(nexusId)) {
            newExpanded.delete(nexusId);
        } else {
            newExpanded.add(nexusId);
        }
        setExpandedNexi(newExpanded);
    };

    const toggleNotebook = (notebookId: string) => {
        const newExpanded = new Set(expandedNotebooks);
        if (newExpanded.has(notebookId)) {
            newExpanded.delete(notebookId);
        } else {
            newExpanded.add(notebookId);
        }
        setExpandedNotebooks(newExpanded);
    };

    const toggleTag = (tagId: string) => {
        const newExpanded = new Set(expandedTags);
        if (newExpanded.has(tagId)) {
            newExpanded.delete(tagId);
        } else {
            newExpanded.add(tagId);
        }
        setExpandedTags(newExpanded);
    };

    // Narrow the router to include optional prefetch without using `any`
    type RouterWithPrefetch = typeof router & { prefetch?: (href: string) => void };
    const prefetch = (href: string) => {
        try {
            (router as RouterWithPrefetch).prefetch?.(href);
        } catch {}
    };

    const handleNexusSelect = (nexusId: Id<"nexi">) => {
        if (onNexusSelected) return onNexusSelected(nexusId);
        router.push(`/nexi/${nexusId}`);
    };

    const handleLocusSelect = (locusId: Id<"notebooks">) => {
        if (onLocusSelected) return onLocusSelected(locusId);
        // Find parent nexus id and navigate
        if (treeData) {
            for (const nexus of treeData) {
                if (nexus.notebooks?.some((nb: { _id: Id<"notebooks">; name: string; description?: string; metaQuestion?: string }) => nb._id === locusId)) {
                    router.push(`/nexi/${nexus._id}/loci/${locusId}`);
                    return;
                }
            }
        }
    };

    const handleTagSelect = (tagId: Id<"tags">) => {
        if (onTagSelected) return onTagSelected(tagId);
        // Find parent nexus and locus for this tag and navigate with tag filter
        if (treeData) {
            for (const nexus of treeData) {
                for (const locus of nexus.notebooks || []) {
                    // top-level tag
                    if (locus.tags?.some((t: { _id: Id<"tags">; name: string; description?: string; childTags?: Array<{ _id: Id<"tags">; name: string }> }) => t._id === tagId)) {
                        router.push(`/nexi/${nexus._id}/loci/${locus._id}?tagId=${tagId}`);
                        return;
                    }
                    // child tags
                    for (const topLevelTag of locus.tags || []) {
                        if (topLevelTag.childTags?.some((ct: { _id: Id<"tags">; name: string }) => ct._id === tagId)) {
                            router.push(`/nexi/${nexus._id}/loci/${locus._id}?tagId=${tagId}`);
                            return;
                        }
                    }
                }
            }
        }
    };

    if (!treeData) {
        return (
            <div className="p-4">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="space-y-1">
                {treeData.map((nexus) => (
                        <TreeNode
                        key={nexus._id}
                        id={nexus._id}
                        name={nexus.name}
                        description={nexus.description}
                        level={0}
                        isExpanded={expandedNexi.has(nexus._id)}
                        onToggle={() => toggleNexus(nexus._id)}
                        isSelected={selectedNexusId === nexus._id || nexus.notebooks?.some((nb: { _id: Id<"notebooks">; name: string; description?: string; tags?: Array<{ _id: Id<"tags">; name: string; description?: string; childTags?: Array<{ _id: Id<"tags">; name: string }> }> }) => nb._id === selectedLocusId || nb.tags?.some(tag => tag._id === selectedTagId || tag.childTags?.some((childTag: { _id: Id<"tags"> }) => childTag._id === selectedTagId)))}
                            onSelect={() => handleNexusSelect(nexus._id)}
                        type="nexus"
                        onContextMenu={(e) => openNexusMenu(e, nexus._id as Id<"nexi">)}
                    >
                            {/* prefetch target on hover */}
                            <div className="hidden" onMouseEnter={() => prefetch(`/nexi/${nexus._id}`)} />
                        {nexus.notebooks?.map((notebook: { _id: Id<"notebooks">; name: string; description?: string; tags?: Array<{ _id: Id<"tags">; name: string; description?: string; childTags?: Array<{ _id: Id<"tags">; name: string }> }> }) => (
                            <TreeNode
                                key={notebook._id}
                                id={notebook._id}
                                name={notebook.name}
                                description={notebook.description}
                                level={1}
                                isExpanded={expandedNotebooks.has(notebook._id)}
                                onToggle={() => toggleNotebook(notebook._id)}
                                isSelected={selectedLocusId === notebook._id || notebook.tags?.some(tag => tag._id === selectedTagId || tag.childTags?.some((childTag: { _id: Id<"tags"> }) => childTag._id === selectedTagId))}
                                onSelect={() => handleLocusSelect(notebook._id)}
                                type="notebook"
                                onContextMenu={(e) => openLocusMenu(e, notebook._id as Id<"notebooks">)}
                            >
                                    <div className="hidden" onMouseEnter={() => prefetch(`/nexi/${nexus._id}/loci/${notebook._id}`)} />
                                {notebook.tags?.map((tag) => (
                                    <TreeNode
                                        key={tag._id}
                                        id={tag._id}
                                        name={tag.name}
                                        description={tag.description}
                                        level={2}
                                        isExpanded={expandedTags.has(tag._id)}
                                        onToggle={() => toggleTag(tag._id)}
                                        isSelected={selectedTagId === tag._id || tag.childTags?.some(childTag => childTag._id === selectedTagId)}
                                        onSelect={() => handleTagSelect(tag._id)}
                                        type="tag"
                                    >
                                            <div className="hidden" onMouseEnter={() => prefetch(`/nexi/${nexus._id}/loci/${notebook._id}?tagId=${tag._id}`)} />
                                {tag.childTags?.map((childTag) => (
                                        <TreeNode
                                            key={childTag._id}
                                            id={childTag._id}
                                            name={childTag.name}
                                            level={3}
                                            isExpanded={false}
                                            onToggle={() => {}}
                                            isSelected={selectedTagId === childTag._id}
                                            onSelect={() => handleTagSelect(childTag._id)}
                                            type="childTag"
                                        />
                                    ))}
                                    </TreeNode>
                                ))}
                            </TreeNode>
                        ))}
                    </TreeNode>
                ))}
            </div>

            {/* Shared Context Menu */}
            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                onClose={closeContextMenu}
                items={
                    contextMenu.type === "nexus"
                        ? [
                            { label: "Edit", icon: (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              ), onClick: () => setNexusEditModal({ isOpen: true, nexusId: contextMenu.nexusId }) },
                            { label: "Delete", icon: (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              ), onClick: () => {
                                    // find name for confirm modal
                                    const nx = treeData?.find((n) => n._id === contextMenu.nexusId);
                                    setNexusDeleteModal({ isOpen: true, nexusId: contextMenu.nexusId, nexusName: nx?.name || "" });
                                }, danger: true },
                          ]
                        : contextMenu.type === "locus"
                        ? [
                            { label: "Edit", icon: (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              ), onClick: handleOpenLocusEdit },
                            { label: "Import", icon: (<DocumentArrowUpIcon className="w-4 h-4" />), onClick: openImportForSelected },
                            { label: "Export", icon: (<ArrowDownTrayIcon className="w-4 h-4" />), onClick: handleExportLocus },
                            { label: "Delete", icon: (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              ), onClick: openLocusDeleteConfirm, danger: true },
                          ]
                        : []
                }
            />

            {/* Nexus Edit Modal */}
            <CustomModal
                isOpen={nexusEditModal.isOpen}
                onClose={() => setNexusEditModal({ isOpen: false, nexusId: null })}
                title={selectedNexus ? `Edit "${selectedNexus.name}"` : "Edit Nexus"}
                fields={nexusEditFields}
                actions={nexusEditActions}
                onSubmit={handleNexusEditSubmit}
                loading={isSubmittingNexusEdit}
            />

            {/* Nexus Delete Confirmation */}
            <InfoModal
                isOpen={nexusDeleteModal.isOpen}
                title="Delete Nexus"
                message={`Are you sure you want to delete "${nexusDeleteModal.nexusName}"? This cannot be undone and will remove all related content.`}
                cancelLabel="Cancel"
                confirmLabel="Delete"
                confirmVariant="danger"
                onClose={() => setNexusDeleteModal({ isOpen: false, nexusId: null, nexusName: "" })}
                onConfirm={async () => {
                    if (!nexusDeleteModal.nexusId) return;
                    try {
                        await deleteNexus({ nexusId: nexusDeleteModal.nexusId });
                    } catch (err) {
                        console.error("Failed to delete nexus:", err);
                    } finally {
                        setNexusDeleteModal({ isOpen: false, nexusId: null, nexusName: "" });
                        closeContextMenu();
                    }
                }}
            />

            {/* Locus Edit Modal */}
            {locusEditModal.isOpen && locusEditModal.locus && (
                <CustomModal
                    isOpen={locusEditModal.isOpen}
                    onClose={() => setLocusEditModal({ isOpen: false, locus: null })}
                    title="Edit Locus"
                    fields={[
                        { name: "name", label: "Locus Name", type: "text", placeholder: "Enter locus name...", required: true, defaultValue: locusEditModal.locus.name, maxLength: 100 },
                        { name: "description", label: "Description", type: "textarea", placeholder: "Describe what this locus is about...", defaultValue: locusEditModal.locus.description || "", maxLength: 500 },
                        { name: "metaQuestion", label: "Meta Question", type: "textarea", placeholder: "What overarching question does this locus address?", defaultValue: locusEditModal.locus.metaQuestion || "", maxLength: 300 },
                    ]}
                    actions={[
                        { label: "Cancel", onClick: () => setLocusEditModal({ isOpen: false, locus: null }), variant: "secondary" },
                        { label: "Update Locus", onClick: () => {}, variant: "primary" },
                    ]}
                    onSubmit={handleLocusEditSubmit}
                />
            )}

            {/* Locus Import Modal */}
            <CustomModal
                isOpen={importModal.isOpen}
                onClose={() => setImportModal({ isOpen: false, locusId: null })}
                title={selectedLocusForImport ? `Import into "${selectedLocusForImport.name}"` : "Import Data"}
                fields={importFields}
                actions={importActions}
                onSubmit={handleImportSubmit}
                loading={isSubmittingImport}
            />

            {/* Info Modal for operations */}
            <InfoModal
                isOpen={infoModal.isOpen}
                title={infoModal.title}
                message={infoModal.message}
                confirmLabel="Ok"
                onClose={() => setInfoModal({ isOpen: false, title: "", message: "" })}
            />

            {/* Locus Delete Confirmation */}
            <InfoModal
                isOpen={locusDeleteModal.isOpen}
                title="Delete Locus"
                message={`Are you sure you want to delete "${locusDeleteModal.locusName}"? This action cannot be undone and will delete all associated chunks, tags, and conversations.`}
                cancelLabel="Cancel"
                confirmLabel="Delete"
                confirmVariant="danger"
                onClose={() => setLocusDeleteModal({ isOpen: false, locusId: null, locusName: "" })}
                onConfirm={async () => {
                    if (!locusDeleteModal.locusId) return;
                    try {
                        await deleteLocus({ notebookId: locusDeleteModal.locusId });
                        setLocusDeleteModal({ isOpen: false, locusId: null, locusName: "" });
                    } catch (error) {
                        console.error("Failed to delete locus:", error);
                        setLocusDeleteModal({ isOpen: false, locusId: null, locusName: "" });
                        setInfoModal({ isOpen: true, title: "Delete Failed", message: "Failed to delete locus" });
                    }
                }}
            />
        </div>
    );
} 