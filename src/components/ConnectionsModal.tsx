"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import ModalBackground from "./ModalBackground";
import { useAuth } from "@clerk/nextjs";

interface ConnectionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    chunkId: Id<"chunks">;
    currentNotebookId: Id<"notebooks">;
}

export default function ConnectionsModal({
    isOpen,
    onClose,
    chunkId,
    currentNotebookId
}: ConnectionsModalProps) {
    const { userId } = useAuth();
    const [selectedNotebookId, setSelectedNotebookId] = useState<Id<"notebooks"> | "">("");
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Get all notebooks across all nexi scoped to user
    const allNotebooks = useQuery(api.queries.getAllNotebooks, userId ? { ownerId: userId } : {});

    // Get existing connections for this chunk
    const connections = useQuery(api.queries.getChunkConnections, { chunkId });

    // Mutations
    const createConnection = useMutation(api.mutations.createChunkConnection);
    const deleteConnection = useMutation(api.mutations.deleteChunkConnection);

    // Filter out current notebook and already connected notebooks
    const connectedNotebookIds = connections?.map(c => c.targetNotebookId) || [];
    const availableNotebooks = allNotebooks?.filter(notebook =>
        notebook._id !== currentNotebookId &&
        !connectedNotebookIds.includes(notebook._id)
    ) || [];

    const handleCreateConnection = async () => {
        if (!selectedNotebookId) return;

        setIsCreating(true);
        try {
            await createConnection({
                sourceChunkId: chunkId,
                targetNotebookId: selectedNotebookId as Id<"notebooks">,
                description: undefined,
            });

            // Reset form
            setSelectedNotebookId("");
        } catch (error) {
            console.error("Failed to create connection:", error);
            alert("Failed to create connection. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteConnection = async (connectionId: Id<"chunkConnections">) => {
        setIsDeleting(connectionId);
        try {
            await deleteConnection({ connectionId });
        } catch (error) {
            console.error("Failed to delete connection:", error);
            alert("Failed to delete connection. Please try again.");
        } finally {
            setIsDeleting(null);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalBackground onClose={onClose}>
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="mb-4 flex-shrink-0 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-semibold text-white">Manage Connections</h3>
                        <p className="text-sm text-gray-400 mt-1">
                            {connections?.length || 0} current connection{connections?.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 flex flex-col space-y-4 min-h-0">
                    {/* Current Connections */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <h4 className="text-lg font-medium text-white mb-3 flex-shrink-0">Current Connections</h4>
                        {connections && connections.length > 0 ? (
                            <div className="flex-1 overflow-y-auto">
                                <div className="grid gap-2">
                                    {connections.map((connection) => (
                                        <div
                                            key={connection._id}
                                            className="bg-gray-700 rounded-lg p-3 border border-gray-600"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium text-white">
                                                        {connection.targetNotebook?.name} ({(connection.targetNotebook as { nexusName?: string })?.nexusName})
                                                    </div>
                                                    {connection.description && (
                                                        <div className="text-gray-300 text-sm mt-1">
                                                            {connection.description}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteConnection(connection._id)}
                                                    disabled={isDeleting === connection._id}
                                                    className="ml-3 p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                                                    title="Delete connection"
                                                >
                                                    {isDeleting === connection._id ? (
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400"></div>
                                                    ) : (
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 py-6 bg-gray-700 rounded-lg flex-shrink-0">
                                <div className="text-sm font-medium mb-1">No connections yet</div>
                                <div className="text-xs">Create a connection to link this chunk to another Locus</div>
                            </div>
                        )}
                    </div>

                    {/* Create New Connection */}
                    {availableNotebooks.length > 0 && (
                        <div className="border-t border-gray-700 pt-4 flex-shrink-0">
                            <h4 className="text-lg font-medium text-white mb-3">Create New Connection</h4>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label htmlFor="notebookSelect" className="block text-sm font-medium text-gray-300 mb-2">
                                        Select Notebook
                                    </label>
                                    <select
                                        id="notebookSelect"
                                        value={selectedNotebookId}
                                        onChange={(e) => setSelectedNotebookId(e.target.value as Id<"notebooks">)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Choose a notebook...</option>
                                        {availableNotebooks.map((notebook) => (
                                            <option key={notebook._id} value={notebook._id}>
                                                {notebook.name} ({notebook.nexusName})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={handleCreateConnection}
                                    disabled={!selectedNotebookId || isCreating}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
                                >
                                    {isCreating ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* No Available Notebooks */}
                    {availableNotebooks.length === 0 && connections && connections.length > 0 && (
                        <div className="border-t border-gray-700 pt-4 flex-shrink-0">
                            <div className="text-center text-gray-400 py-3">
                                <div className="text-sm">All available notebooks are already connected</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ModalBackground>
    );
} 