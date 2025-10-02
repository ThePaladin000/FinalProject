"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getMetaTagColorClasses } from "../utils/metaTagColors";

interface MetaTagSelectorProps {
    chunkId: Id<"chunks">;
    currentMetaTagId?: Id<"metaTags">;
    metaTags: Array<{
        _id: Id<"metaTags">;
        name: string;
        displayColor: "BLUE" | "GREEN" | "YELLOW" | "RED" | "PURPLE";
        description: string;
    }>;
    className?: string;
}

export default function MetaTagSelector({
    chunkId,
    currentMetaTagId,
    metaTags,
    className = ""
}: MetaTagSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const assignMetaTag = useMutation(api.mutations.assignMetaTagToChunk);

    const currentMetaTag = metaTags.find(tag => tag._id === currentMetaTagId);

    const handleMetaTagSelect = async (metaTagId: Id<"metaTags"> | undefined) => {
        await assignMetaTag({ chunkId, metaTagId });
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`}>
            {/* Current meta tag display */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${currentMetaTag
                    ? `${getMetaTagColorClasses(currentMetaTag.displayColor, 'bg')} text-white font-medium hover:opacity-80`
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                    }`}
            >
                {currentMetaTag ? (
                    <>
                        <span className="text-xs">{currentMetaTag.name}</span>
                        <svg
                            className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </>
                ) : (
                    <>
                        <span className="text-xs">Select Meta Tag</span>
                        <svg
                            className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </>
                )}
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10">
                    <div className="p-2">
                        <div className="text-xs font-medium text-gray-400 mb-2 px-2">Select Meta Tag</div>
                        {metaTags.map((metaTag) => (
                            <button
                                key={metaTag._id}
                                onClick={() => handleMetaTagSelect(metaTag._id)}
                                className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700 transition-colors ${currentMetaTagId === metaTag._id ? 'bg-gray-700' : ''
                                    }`}
                            >
                                <div className={`w-3 h-3 rounded-full ${getMetaTagColorClasses(metaTag.displayColor, 'bg')}`} />
                                <div className="font-medium text-sm text-white">{metaTag.name}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Click outside to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
} 