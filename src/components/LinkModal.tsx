"use client";

import { useState } from "react";
import ModalBackground from "./ModalBackground";

interface LinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (linkName: string, linkUrl: string) => void;
    initialLinkName?: string;
    initialLinkUrl?: string;
}

export default function LinkModal({
    isOpen,
    onClose,
    onSave,
    initialLinkName = "",
    initialLinkUrl = ""
}: LinkModalProps) {
    const [linkName, setLinkName] = useState(initialLinkName);
    const [linkUrl, setLinkUrl] = useState(initialLinkUrl);

    const handleSave = () => {
        if (linkName.trim() && linkUrl.trim()) {
            onSave(linkName.trim(), linkUrl.trim());
            onClose();
            // Reset form
            setLinkName("");
            setLinkUrl("");
        }
    };

    const handleCancel = () => {
        onClose();
        // Reset form
        setLinkName("");
        setLinkUrl("");
    };

    if (!isOpen) return null;

    return (
        <ModalBackground onClose={onClose}>
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Add Link</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="linkName" className="block text-sm font-medium text-gray-300 mb-2">
                            Link Name *
                        </label>
                        <input
                            type="text"
                            id="linkName"
                            value={linkName}
                            onChange={(e) => setLinkName(e.target.value)}
                            placeholder="Enter a descriptive name for this link..."
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            autoFocus
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="linkUrl" className="block text-sm font-medium text-gray-300 mb-2">
                            URL *
                        </label>
                        <input
                            type="url"
                            id="linkUrl"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!linkName.trim() || !linkUrl.trim()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
                    >
                        Save Link
                    </button>
                </div>
            </div>
        </ModalBackground>
    );
} 