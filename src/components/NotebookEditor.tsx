"use client";

import { useState } from "react";
import { Chunk } from "../utils/chunking";
import MarkdownRenderer from "./MarkdownRenderer";

interface NotebookEditorProps {
    chunks: Chunk[];
    onChunkEdit: (chunkId: string, newContent: string) => void;
    onChunkDelete: (chunkId: string) => void;
    onChunkAdd: (content: string, chunkType: "text" | "code") => void;
    className?: string;
}

export default function NotebookEditor({
    chunks,
    onChunkEdit,
    onChunkDelete,
    onChunkAdd,
    className = ""
}: NotebookEditorProps) {
    const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState("");
    const [isAddingChunk, setIsAddingChunk] = useState(false);
    const [newChunkContent, setNewChunkContent] = useState("");
    const [newChunkType, setNewChunkType] = useState<"text" | "code">("text");

    const handleEditStart = (chunk: Chunk) => {
        setEditingChunkId(chunk.id);
        setEditingContent(chunk.content);
    };

    const handleEditSave = () => {
        if (editingChunkId && editingContent.trim()) {
            onChunkEdit(editingChunkId, editingContent);
            setEditingChunkId(null);
            setEditingContent("");
        }
    };

    const handleEditCancel = () => {
        setEditingChunkId(null);
        setEditingContent("");
    };

    const handleAddChunk = () => {
        if (newChunkContent.trim()) {
            onChunkAdd(newChunkContent, newChunkType);
            setNewChunkContent("");
            setNewChunkType("text");
            setIsAddingChunk(false);
        }
    };

    const handleAddCancel = () => {
        setNewChunkContent("");
        setNewChunkType("text");
        setIsAddingChunk(false);
    };

    return (
        <div className={`bg-gray-900 rounded-lg ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Notebook Editor</h3>
                <button
                    onClick={() => setIsAddingChunk(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                    Add Chunk
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Add New Chunk */}
                {isAddingChunk && (
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                        <div className="flex items-center gap-2 mb-3">
                            <select
                                value={newChunkType}
                                onChange={(e) => setNewChunkType(e.target.value as "text" | "code")}
                                className="bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                <option value="text">Text</option>
                                <option value="code">Code</option>
                            </select>
                            <span className="text-gray-400 text-sm">New Chunk</span>
                        </div>

                        {newChunkType === "code" ? (
                            <textarea
                                value={newChunkContent}
                                onChange={(e) => setNewChunkContent(e.target.value)}
                                placeholder="Enter your code..."
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                rows={6}
                            />
                        ) : (
                            <textarea
                                value={newChunkContent}
                                onChange={(e) => setNewChunkContent(e.target.value)}
                                placeholder="Enter your text..."
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                rows={4}
                            />
                        )}

                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleAddChunk}
                                disabled={!newChunkContent.trim()}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                                Add
                            </button>
                            <button
                                onClick={handleAddCancel}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Existing Chunks */}
                {chunks.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        <div className="text-lg font-medium mb-2">No chunks yet</div>
                        <div className="text-sm">Add your first chunk to get started</div>
                    </div>
                ) : (
                    chunks.map((chunk, index) => (
                        <div key={chunk.id} className="bg-gray-800 rounded-lg border border-gray-600">
                            {/* Chunk Header */}
                            <div className="flex items-center justify-between p-3 border-b border-gray-600">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
                                        {index + 1}
                                    </div>
                                    <span className="text-gray-300 text-sm font-medium">
                                        {chunk.chunkType === "code" ? "Code" : "Text"}
                                    </span>
                                    {/* Title removed */}
                                </div>
                                <div className="flex items-center gap-2">
                                    {editingChunkId === chunk.id ? (
                                        <>
                                            <button
                                                onClick={handleEditSave}
                                                disabled={!editingContent.trim()}
                                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-2 py-1 rounded text-xs transition-colors"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={handleEditCancel}
                                                className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleEditStart(chunk)}
                                                className="text-blue-400 hover:text-blue-300 px-2 py-1 rounded text-xs transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => onChunkDelete(chunk.id)}
                                                className="text-red-400 hover:text-red-300 px-2 py-1 rounded text-xs transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Chunk Content */}
                            <div className="p-3">
                                {editingChunkId === chunk.id ? (
                                    chunk.chunkType === "code" ? (
                                        <textarea
                                            value={editingContent}
                                            onChange={(e) => setEditingContent(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.ctrlKey && e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleEditSave();
                                                }
                                            }}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            rows={Math.max(6, editingContent.split('\n').length)}
                                        />
                                    ) : (
                                        <textarea
                                            value={editingContent}
                                            onChange={(e) => setEditingContent(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.ctrlKey && e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleEditSave();
                                                }
                                            }}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            rows={Math.max(4, editingContent.split('\n').length)}
                                        />
                                    )
                                ) : (
                                    <div className="text-gray-200">
                                        {chunk.chunkType === "code" ? (
                                            <pre className="bg-gray-700 p-3 rounded font-mono text-sm overflow-x-auto">
                                                <code>{chunk.content}</code>
                                            </pre>
                                        ) : (
                                            <MarkdownRenderer content={chunk.content} />
                                        )}
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

                            {/* Chunk Footer */}
                            <div className="px-3 py-2 bg-gray-700 rounded-b-lg text-xs text-gray-400">
                                <div className="flex items-center justify-between">
                                    <span>{chunk.source}</span>
                                    <span>{new Date(chunk.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
} 