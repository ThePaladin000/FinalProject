"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import ModalBackground from "./ModalBackground";
import { useModal } from "@/hooks/useModal";

interface MoveModalProps {
    isOpen: boolean;
    onClose: () => void;
    chunkId: Id<"chunks">;
    currentNotebookId: Id<"notebooks">;
}

export default function MoveModal({
    isOpen,
    onClose,
    chunkId,
    currentNotebookId,
}: MoveModalProps) {
    const { userId } = useAuth();
    const [selectedNotebookId, setSelectedNotebookId] = useState<Id<"notebooks"> | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const modalRef = useModal(isOpen, onClose);

    // Get all notebooks for selection scoped to user
    const notebooks = useQuery(api.queries.getAllNotebooks, userId ? { ownerId: userId } : {});
    const moveChunk = useMutation(api.mutations.moveChunk);

    // Reset selection when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedNotebookId(null);
            setIsMoving(false);
        }
    }, [isOpen]);

    const handleMove = async () => {
        if (!selectedNotebookId) return;

        setIsMoving(true);
        try {
            await moveChunk({
                chunkId,
                targetNotebookId: selectedNotebookId,
            });
            onClose();
        } catch (error) {
            console.error("Failed to move chunk:", error);
        } finally {
            setIsMoving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalBackground onClose={onClose}>
            <div ref={modalRef} className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Move Snippet</h3>
                        <p className="text-sm text-gray-400">Select destination notebook</p>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Destination Notebook
                    </label>
                    <select
                        value={selectedNotebookId || ""}
                        onChange={(e) => setSelectedNotebookId(e.target.value as Id<"notebooks">)}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select a notebook...</option>
                        {notebooks?.map((notebook) => (
                            <option
                                key={notebook._id}
                                value={notebook._id}
                                disabled={notebook._id === currentNotebookId}
                            >
                                {notebook.name} ({notebook.nexusName})
                                {notebook._id === currentNotebookId ? " (current)" : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        disabled={isMoving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleMove}
                        disabled={!selectedNotebookId || isMoving}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        {isMoving ? "Moving..." : "Move"}
                    </button>
                </div>
            </div>
        </ModalBackground>
    );
} 