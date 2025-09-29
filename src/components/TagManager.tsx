"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Id } from "@convex/_generated/dataModel";
import { useGuestSessionId } from "@/utils/guestSession";

import CustomModal, { ModalField, ModalAction } from "./CustomModal";
import ModalBackground from "./ModalBackground";

interface TagManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

interface TagWithInfo {
    _id: Id<"tags">;
    name: string;
    description?: string;
    parentTagId?: Id<"tags">;
    color?: string;
    originNotebookId?: Id<"notebooks">;
    originNexusId?: Id<"nexi">;
    notebookId: Id<"notebooks">;
    createdAt: number;
    updatedAt: number;
    order?: number;
    parentTag?: {
        _id: Id<"tags">;
        name: string;
    } | null;
    originNotebook?: {
        _id: Id<"notebooks">;
        name: string;
    } | null;
    originNexus?: {
        _id: Id<"nexi">;
        name: string;
    } | null;
    currentNotebook?: {
        _id: Id<"notebooks">;
        name: string;
    } | null;
    currentNexus?: {
        _id: Id<"nexi">;
        name: string;
    } | null;
    totalUsage: number;
    children?: TagWithInfo[];
    usageByLocation?: Array<{
        nexusId: string;
        nexusName: string;
        notebooks: Record<string, {
            notebookId: string;
            notebookName: string;
            chunks: Array<{
                chunkId: string;
                chunkTitle?: string;
                chunkText: string;
            }>;
        }>;
    }>;
}

export default function TagManager({ isOpen, onClose }: TagManagerProps) {
    const [selectedNexusFilter, setSelectedNexusFilter] = useState<Id<"nexi"> | null>(null);
    const [selectedNotebookFilter, setSelectedNotebookFilter] = useState<Id<"notebooks"> | null>(null);
    const [showAllTags, setShowAllTags] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTag, setSelectedTag] = useState<TagWithInfo | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReparentModalOpen, setIsReparentModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<TagWithInfo | null>(null);

    // Queries
      const { userId, isSignedIn } = useAuth();
  const guestSessionId = useGuestSessionId();
    const nexi = useQuery(
      api.queries.getNexi, 
      isSignedIn 
        ? { ownerId: userId } 
        : guestSessionId 
          ? { guestSessionId } 
          : "skip"
    );
    const allTags = useQuery(api.queries.getAllTagsForManager, userId ? { ownerId: userId } : "skip");
    // All notebooks across nexi, used to populate create-tag dropdown even when no tags exist yet
    const allNotebooks = useQuery(api.queries.getAllNotebooks, userId ? { ownerId: userId } : {});
    const tagsByOriginNexus = useQuery(
        api.queries.getTagsByOriginNexus,
        userId && selectedNexusFilter ? { nexusId: selectedNexusFilter, ownerId: userId } : "skip"
    );
    const tagsByOriginNotebook = useQuery(
        api.queries.getTagsByOriginNotebook,
        userId && selectedNotebookFilter ? { notebookId: selectedNotebookFilter, ownerId: userId } : "skip"
    );

    // Mutations
    const updateTag = useMutation(api.mutations.updateTag);
    const deleteTag = useMutation(api.mutations.deleteTag);
    const reparentTag = useMutation(api.mutations.reparentTag);
    const createTag = useMutation(api.mutations.createTag);

    // Get the appropriate tag data based on filters
    const getFilteredTags = (): TagWithInfo[] => {
        if (showAllTags) {
            return allTags || [];
        } else if (selectedNotebookFilter) {
            return tagsByOriginNotebook || [];
        } else if (selectedNexusFilter) {
            return tagsByOriginNexus || [];
        }
        return allTags || [];
    };

    // Filter tags by search term
    const getSearchFilteredTags = (): TagWithInfo[] => {
        const filteredTags = getFilteredTags();
        if (!searchTerm.trim()) return filteredTags;

        const searchLower = searchTerm.toLowerCase();
        return filteredTags.filter(tag =>
            tag.name.toLowerCase().includes(searchLower) ||
            tag.description?.toLowerCase().includes(searchLower) ||
            tag.originNotebook?.name.toLowerCase().includes(searchLower) ||
            tag.originNexus?.name.toLowerCase().includes(searchLower)
        );
    };

    // Debug function to check for duplicates
    const debugTags = (tags: TagWithInfo[]) => {
        const tagIds = tags.map(tag => tag._id);
        const uniqueIds = new Set(tagIds);
        if (tagIds.length !== uniqueIds.size) {
            console.warn('Duplicate tags found:', {
                total: tagIds.length,
                unique: uniqueIds.size,
                duplicates: tagIds.filter((id, index) => tagIds.indexOf(id) !== index)
            });
        }
    };

    // Build hierarchical tree structure
    const buildTagTree = (tags: TagWithInfo[]): TagWithInfo[] => {
        // Deduplicate tags by ID first
        const uniqueTags = Array.from(
            new Map(tags.map(tag => [tag._id, tag])).values()
        );

        const tagMap = new Map<string, TagWithInfo>();
        const rootTags: TagWithInfo[] = [];

        // Create a map of all tags and clear any existing children arrays
        uniqueTags.forEach(tag => {
            tagMap.set(tag._id, { ...tag, children: [] });
        });

        // Build the tree
        uniqueTags.forEach(tag => {
            if (tag.parentTagId && tagMap.has(tag.parentTagId)) {
                const parent = tagMap.get(tag.parentTagId)!;
                if (!parent.children) parent.children = [];
                // Check if this tag is already in the children array
                const existingChild = parent.children.find(child => child._id === tag._id);
                if (!existingChild) {
                    parent.children.push(tagMap.get(tag._id)!);
                }
            } else {
                rootTags.push(tagMap.get(tag._id)!);
            }
        });

        return rootTags;
    };

    // Render tag tree recursively
    const renderTagTree = (tags: TagWithInfo[], level: number = 0) => {
        return tags.map(tag => (
            <div key={tag._id} style={{ marginLeft: `${level * 20}px` }}>
                <div
                    className={`p-3 bg-gray-800 rounded-lg border border-gray-700 mb-2 cursor-pointer hover:bg-gray-750 transition-colors ${selectedTag?._id === tag._id ? 'border-purple-500 bg-gray-750' : ''
                        }`}
                    onClick={() => setSelectedTag(tag)}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-white">{tag.name}</h3>
                            </div>

                            <div className="text-sm text-gray-400 space-y-1">
                                {tag.description && (
                                    <div className="line-clamp-2">{tag.description}</div>
                                )}

                                <div className="flex items-center gap-4 text-xs">
                                    {tag.parentTag && (
                                        <span>Parent: {tag.parentTag.name}</span>
                                    )}

                                    {tag.originNotebook && tag.originNexus && (
                                        <span>
                                            Home: {tag.originNexus.name} / {tag.originNotebook.name}
                                        </span>
                                    )}

                                    <span>Used by {tag.totalUsage} snippets</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTag(tag);
                                    setIsEditModalOpen(true);
                                }}
                                className="text-gray-400 hover:text-white p-1"
                                title="Edit tag"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTag(tag);
                                    setIsReparentModalOpen(true);
                                }}
                                className="text-gray-400 hover:text-blue-400 p-1"
                                title="Reparent tag"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTag(tag);
                                    setIsDeleteModalOpen(true);
                                }}
                                className="text-gray-400 hover:text-red-400 p-1"
                                title="Delete tag"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {tag.children && tag.children.length > 0 && (
                    <div className="ml-4">
                        {renderTagTree(tag.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    // Modal handlers
    const handleEditSubmit = async (data: Record<string, string>) => {
        if (!editingTag) return;

        try {
            const tagName = data.name?.trim();
            if (!tagName) {
                alert('Tag name is required');
                return;
            }

            if (tagName.length > 20) {
                alert('Tag name must be 20 characters or less');
                return;
            }

            await updateTag({
                tagId: editingTag._id,
                name: tagName,
                description: data.description?.trim() || undefined,
            });
            setIsEditModalOpen(false);
            setEditingTag(null);
        } catch (error) {
            console.error('Failed to update tag:', error);
            alert('Failed to update tag');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!editingTag) return;

        try {
            await deleteTag({ tagId: editingTag._id });
            setIsDeleteModalOpen(false);
            setEditingTag(null);
            setSelectedTag(null);
        } catch (error) {
            console.error('Failed to delete tag:', error);
            alert('Failed to delete tag');
        }
    };

    const handleReparentSubmit = async (data: Record<string, string>) => {
        if (!editingTag) return;

        try {
            const newParentTagId = data.parentTagId ? data.parentTagId as Id<"tags"> : undefined;
            await reparentTag({
                tagId: editingTag._id,
                newParentTagId,
            });
            setIsReparentModalOpen(false);
            setEditingTag(null);
            setSelectedTag(null); // Clear selected tag to force re-render
        } catch (error) {
            console.error('Failed to reparent tag:', error);
            alert('Failed to reparent tag');
        }
    };

    const handleCreateSubmit = async (data: Record<string, string>) => {
        try {
            const notebookId = data.notebookId as Id<"notebooks">;
            if (!notebookId) {
                alert('Please select a notebook');
                return;
            }

            const tagName = data.name?.trim();
            if (!tagName) {
                alert('Tag name is required');
                return;
            }

            if (tagName.length > 20) {
                alert('Tag name must be 20 characters or less');
                return;
            }

            const parentTagId = data.parentTagId ? data.parentTagId as Id<"tags"> : undefined;

            await createTag({
                notebookId,
                name: tagName,
                description: data.description?.trim() || undefined,
                parentTagId,
            });

            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Failed to create tag:', error);
            alert('Failed to create tag');
        }
    };

    // Get modal configurations
    const getEditModalConfig = () => {
        if (!editingTag) return null;

        const fields: ModalField[] = [
            {
                name: "name",
                label: "Tag Name",
                type: "text",
                placeholder: "Enter tag name...",
                required: true,
                defaultValue: editingTag.name,
                maxLength: 20,
            },
            {
                name: "description",
                label: "Description",
                type: "textarea",
                placeholder: "Describe what this tag represents...",
                defaultValue: editingTag.description || "",
                maxLength: 200,
            },

        ];

        const actions: ModalAction[] = [
            {
                label: "Cancel",
                onClick: () => {
                    setIsEditModalOpen(false);
                    setEditingTag(null);
                },
                variant: "secondary",
            },
            {
                label: "Update Tag",
                onClick: () => { },
                variant: "primary",
            },
        ];

        return { fields, actions, title: "Edit Tag" };
    };

    const getReparentModalConfig = () => {
        if (!editingTag || !allTags) return null;

        const availableParents = allTags.filter(tag =>
            tag._id !== editingTag._id &&
            !tag.parentTagId // Only show root tags as potential parents
        );

        const fields: ModalField[] = [
            {
                name: "parentTagId",
                label: "Parent Tag",
                type: "select",
                placeholder: "Select parent tag (optional)...",
                defaultValue: editingTag.parentTagId || "",
                options: [
                    { value: "", label: "No parent (root tag)" },
                    ...availableParents.map(tag => ({
                        value: tag._id,
                        label: tag.name
                    }))
                ],
            },
        ];

        const actions: ModalAction[] = [
            {
                label: "Cancel",
                onClick: () => {
                    setIsReparentModalOpen(false);
                    setEditingTag(null);
                },
                variant: "secondary",
            },
            {
                label: "Reparent Tag",
                onClick: () => { },
                variant: "primary",
            },
        ];

        return { fields, actions, title: "Reparent Tag" };
    };

    const getCreateModalConfig = () => {
        // Prefer full list of notebooks; fall back to deriving from existing tags if needed
        type NotebookOption = { _id: Id<"notebooks">; name: string; nexusName?: string };
        const notebooks = (allNotebooks || []) as NotebookOption[];
        const availableNotebooks: NotebookOption[] = notebooks.length > 0
            ? notebooks
            : Array.from(
                new Map(
                    (allTags || [])
                        .filter(tag => tag.currentNotebook)
                        .map(tag => [tag.currentNotebook!._id, tag.currentNotebook!])
                ).values()
              ).map(nb => ({ _id: nb._id as Id<"notebooks">, name: nb.name }));

        const fields: ModalField[] = [
            {
                name: "name",
                label: "Tag Name",
                type: "text",
                placeholder: "Enter tag name...",
                required: true,
                maxLength: 20,
            },
            {
                name: "description",
                label: "Description",
                type: "textarea",
                placeholder: "Describe what this tag represents...",
                maxLength: 200,
            },
            {
                name: "notebookId",
                label: "Notebook",
                type: "select",
                placeholder: "Select notebook...",
                required: true,
                defaultValue: availableNotebooks[0]?._id || "",
                options: availableNotebooks.map((notebook) => ({
                    value: notebook._id,
                    label: notebook.nexusName ? `${notebook.name} (${notebook.nexusName})` : notebook.name,
                })),
            },
            {
                name: "parentTagId",
                label: "Parent Tag",
                type: "select",
                placeholder: "Select parent tag (optional)...",
                options: [
                    { value: "", label: "No parent (root tag)" },
                    ...(allTags || []).filter(tag => !tag.parentTagId).map(tag => ({
                        value: tag._id,
                        label: tag.name
                    }))
                ],
            },
        ];

        const actions: ModalAction[] = [
            {
                label: "Cancel",
                onClick: () => {
                    setIsCreateModalOpen(false);
                },
                variant: "secondary",
            },
            {
                label: "Create Tag",
                onClick: () => { },
                variant: "primary",
            },
        ];

        return { fields, actions, title: "Create New Tag" };
    };

    if (!isOpen) return null;

    const searchFilteredTags = getSearchFilteredTags();
    debugTags(searchFilteredTags); // Debug for duplicates
    const tagTree = buildTagTree(searchFilteredTags);

    return (
        <>
            <ModalBackground>
                <div className="bg-gray-900 rounded-lg w-full max-w-[90vw] h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <h2 className="text-2xl font-semibold">Tag Manager</h2>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-2 bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white px-3 py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Tag
                            </button>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-white"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Panel - Filters and Tag Tree */}
                        <div className="w-1/2 flex flex-col border-r border-gray-700">
                            {/* Filters */}
                            <div className="p-4 border-b border-gray-700">
                                <div className="space-y-4">
                                    {/* Search */}
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Search tags..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>

                                    {/* Filter Controls */}
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={showAllTags}
                                                onChange={(e) => setShowAllTags(e.target.checked)}
                                                className="rounded"
                                            />
                                            <span className="text-sm">Show All Tags</span>
                                        </label>
                                    </div>

                                    {!showAllTags && (
                                        <div className="space-y-2">
                                            {/* Nexus Filter */}
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Filter by Origin Nexus:</label>
                                                <select
                                                    value={selectedNexusFilter || ""}
                                                    onChange={(e) => {
                                                        setSelectedNexusFilter(e.target.value ? e.target.value as Id<"nexi"> : null);
                                                        setSelectedNotebookFilter(null);
                                                    }}
                                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                >
                                                    <option value="">All Nexuses</option>
                                                    {nexi?.map(nexus => (
                                                        <option key={nexus._id} value={nexus._id}>
                                                            {nexus.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Notebook Filter */}
                                            {selectedNexusFilter && (
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Filter by Origin Notebook:</label>
                                                    <select
                                                        value={selectedNotebookFilter || ""}
                                                        onChange={(e) => setSelectedNotebookFilter(e.target.value ? e.target.value as Id<"notebooks"> : null)}
                                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    >
                                                        <option value="">All Notebooks</option>
                                                        {/* This would need to be populated with notebooks from the selected nexus */}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tag Tree */}
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="space-y-2">
                                    {tagTree.length > 0 ? (
                                        renderTagTree(tagTree)
                                    ) : (
                                        <div className="text-center text-gray-400 py-8">
                                            <div className="text-lg font-medium mb-2">No tags found</div>
                                            <div className="text-sm">
                                                {searchTerm.trim() ? "Try adjusting your search terms" : "Create some tags to get started"}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Panel - Tag Details */}
                        <div className="w-1/2 flex flex-col">
                            {selectedTag ? (
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="space-y-6">
                                        {/* Tag Details */}
                                        <div className="bg-gray-800 rounded-lg p-4">
                                            <div className="flex items-center gap-3 mb-4">
                                                <h3 className="text-xl font-semibold">{selectedTag.name}</h3>
                                            </div>

                                            {selectedTag.description && (
                                                <p className="text-gray-300 mb-4">{selectedTag.description}</p>
                                            )}

                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-400">Parent Tag:</span>
                                                    <div className="text-white">
                                                        {selectedTag.parentTag ? selectedTag.parentTag.name : "None"}
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="text-gray-400">Total Usage:</span>
                                                    <div className="text-white">{selectedTag.totalUsage} snippets</div>
                                                </div>

                                                <div>
                                                    <span className="text-gray-400">Origin:</span>
                                                    <div className="text-white">
                                                        {selectedTag.originNexus?.name} / {selectedTag.originNotebook?.name}
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="text-gray-400">Current Location:</span>
                                                    <div className="text-white">
                                                        {selectedTag.currentNexus?.name} / {selectedTag.currentNotebook?.name}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Usage Locations */}
                                        {selectedTag.usageByLocation && selectedTag.usageByLocation.length > 0 && (
                                            <div className="bg-gray-800 rounded-lg p-4">
                                                <h4 className="text-lg font-semibold mb-4">Usage Locations</h4>
                                                <div className="space-y-4">
                                                    {selectedTag.usageByLocation.map((location, index) => (
                                                        <div key={index} className="border-l-2 border-purple-500 pl-4">
                                                            <h5 className="font-medium text-purple-400 mb-2">
                                                                Nexus: {location.nexusName}
                                                            </h5>
                                                            <div className="space-y-2">
                                                                {Object.values(location.notebooks).map((notebook, nbIndex) => (
                                                                    <div key={nbIndex} className="ml-4">
                                                                        <div className="text-sm text-gray-300 mb-1">
                                                                            Notebook: {notebook.notebookName} ({notebook.chunks.length} snippets)
                                                                        </div>
                                                                        <div className="ml-4 space-y-1">
                                                                            {notebook.chunks.slice(0, 3).map((chunk, chunkIndex) => (
                                                                                <div key={chunkIndex} className="text-xs text-gray-400 bg-gray-750 p-2 rounded">
                                                                                    <div className="font-medium">{chunk.chunkTitle || 'Untitled'}</div>
                                                                                    <div className="line-clamp-2">{chunk.chunkText}</div>
                                                                                </div>
                                                                            ))}
                                                                            {notebook.chunks.length > 3 && (
                                                                                <div className="text-xs text-gray-500">
                                                                                    +{notebook.chunks.length - 3} more snippets
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center text-gray-400">
                                        <div className="text-lg font-medium mb-2">Select a Tag</div>
                                        <div className="text-sm">Choose a tag from the list to view its details</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Modals */}
                    {isEditModalOpen && getEditModalConfig() && (
                        <CustomModal
                            isOpen={isEditModalOpen}
                            onClose={() => {
                                setIsEditModalOpen(false);
                                setEditingTag(null);
                            }}
                            title={getEditModalConfig()!.title}
                            fields={getEditModalConfig()!.fields}
                            actions={getEditModalConfig()!.actions}
                            onSubmit={handleEditSubmit}
                        />
                    )}

                    {isReparentModalOpen && getReparentModalConfig() && (
                        <CustomModal
                            isOpen={isReparentModalOpen}
                            onClose={() => {
                                setIsReparentModalOpen(false);
                                setEditingTag(null);
                            }}
                            title={getReparentModalConfig()!.title}
                            fields={getReparentModalConfig()!.fields}
                            actions={getReparentModalConfig()!.actions}
                            onSubmit={handleReparentSubmit}
                        />
                    )}

                    {isCreateModalOpen && getCreateModalConfig() && (
                        <CustomModal
                            isOpen={isCreateModalOpen}
                            onClose={() => {
                                setIsCreateModalOpen(false);
                            }}
                            title={getCreateModalConfig()!.title}
                            fields={getCreateModalConfig()!.fields}
                            actions={getCreateModalConfig()!.actions}
                            onSubmit={handleCreateSubmit}
                        />
                    )}

                </div>
            </ModalBackground>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && editingTag && (
                <ModalBackground>
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Delete Tag</h3>
                                <p className="text-sm text-gray-400">This action cannot be undone</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-gray-300">
                                Are you sure you want to delete the tag &ldquo;{editingTag?.name}&rdquo;?
                                This will remove it from {editingTag?.totalUsage} snippets.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setEditingTag(null);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </ModalBackground>
            )}
        </>
    );
} 