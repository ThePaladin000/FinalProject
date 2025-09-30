"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import ModalBackground from "./ModalBackground";
import { useModal } from "@/hooks/useModal";

interface ChunkTagsModalProps {
    isOpen: boolean;
    onClose: () => void;
    chunkId: Id<"chunks">;
    notebookId: Id<"notebooks">;
    nexusId: Id<"nexi">;
}

export default function ChunkTagsModal({ isOpen, onClose, chunkId, notebookId, nexusId }: ChunkTagsModalProps) {
    const { userId } = useAuth();
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const modalRef = useModal(isOpen, onClose);

    // Queries
    const tagsByContext = useQuery(api.queries.getTagsByContext, userId ? {
        currentNotebookId: notebookId,
        currentNexusId: nexusId,
        ownerId: userId
    } : "skip");
    const chunkTags = useQuery(api.queries.getTagsByChunk, { chunkId });

    // Mutations
    const assignTagsToChunk = useMutation(api.mutations.assignTagsToChunk);

    // Initialize selected tags when modal opens
    useEffect(() => {
        if (isOpen && chunkTags) {
            setSelectedTagIds(chunkTags.map(tag => tag._id));
        }
    }, [isOpen, chunkTags]);

    const handleTagToggle = async (tagId: string) => {
        const isCurrentlySelected = selectedTagIds.includes(tagId);
        const newSelectedIds = isCurrentlySelected
            ? selectedTagIds.filter(id => id !== tagId)
            : [...selectedTagIds, tagId];

        setSelectedTagIds(newSelectedIds);
    };

    const handleSave = async () => {
        setIsUpdating(true);
        try {
            await assignTagsToChunk({
                chunkId,
                tagIds: selectedTagIds as Id<"tags">[]
            });

            onClose();
        } catch (error) {
            console.error('Failed to save tag assignments:', error);
            alert('Failed to save tag assignments');
        } finally {
            setIsUpdating(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderTagSection = (title: string, tags: any[], context: string) => {
        if (!tags || tags.length === 0) return null;

        return (
            <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${context === 'locus' ? 'bg-green-500' :
                        context === 'nexus' ? 'bg-blue-500' :
                            'bg-gray-500'
                        }`}></span>
                    {title}
                    <span className="text-xs text-gray-500">({tags.length})</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {tags.map((tag) => {
                        const isSelected = selectedTagIds.includes(tag._id);
                        return (
                            <button
                                key={tag._id}
                                onClick={() => handleTagToggle(tag._id)}
                                className={`p-3 rounded-lg border transition-colors text-left ${isSelected
                                    ? 'bg-purple-600 border-purple-500 text-white'
                                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                                    }`}
                                title={tag.description || tag.name}
                            >
                                <div className="font-medium text-sm truncate">{tag.name}</div>
                                {tag.description && (
                                    <div className={`text-xs mt-1 line-clamp-2 ${isSelected ? 'text-purple-200' : 'text-gray-400'}`}>
                                        {tag.description}
                                    </div>
                                )}
                                {tag.originNotebook && (
                                    <div className={`text-xs mt-1 truncate ${isSelected ? 'text-purple-300' : 'text-gray-500'}`}>
                                        from {tag.originNotebook.name}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    const totalTags = (tagsByContext?.locusTags?.length || 0) +
        (tagsByContext?.nexusTags?.length || 0) +
        (tagsByContext?.globalTags?.length || 0);

    return (
        <ModalBackground className="p-4" onClose={onClose}>
            <div ref={modalRef} className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Select Tags</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            {selectedTagIds.length} of {totalTags} tags selected
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {tagsByContext ? (
                        <div>
                            {/* Locus Tags (Current locus) */}
                            {renderTagSection(
                                "Current Locus Tags",
                                tagsByContext.locusTags || [],
                                'locus'
                            )}

                            {/* Nexus Tags (Other loci in same nexus) */}
                            {renderTagSection(
                                "Other Loci in Nexus",
                                tagsByContext.nexusTags || [],
                                'nexus'
                            )}

                            {/* Global Tags (All other tags) */}
                            {renderTagSection(
                                "All Other Tags",
                                tagsByContext.globalTags || [],
                                'global'
                            )}

                            {totalTags === 0 && (
                                <div className="text-center text-gray-400 py-8">
                                    <div className="text-lg font-medium mb-2">No tags available</div>
                                    <div className="text-sm">Create some tags in the Tag Manager first</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-700">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isUpdating}
                            className="flex-1 px-4 py-2 bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </ModalBackground>
    );
} 