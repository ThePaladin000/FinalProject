"use client";

import { useState } from "react";
import ModalBackground from "./ModalBackground";
import { PaperClipIcon } from "@heroicons/react/24/outline";

interface AttachmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (attachmentName: string, attachmentUrl: string) => void;
    initialAttachmentName?: string;
    initialAttachmentUrl?: string;
}

export default function AttachmentModal({
    isOpen,
    onClose,
    onSave,
    initialAttachmentName = "",
    initialAttachmentUrl = ""
}: AttachmentModalProps) {
    const [attachmentName, setAttachmentName] = useState(initialAttachmentName);
    const [attachmentUrl, setAttachmentUrl] = useState(initialAttachmentUrl);

    const handleSave = () => {
        if (attachmentName.trim() && attachmentUrl.trim()) {
            onSave(attachmentName.trim(), attachmentUrl.trim());
            onClose();
            // Reset form
            setAttachmentName("");
            setAttachmentUrl("");
        }
    };

    const handleCancel = () => {
        onClose();
        // Reset form
        setAttachmentName("");
        setAttachmentUrl("");
    };

    if (!isOpen) return null;

    return (
        <ModalBackground onClose={onClose}>
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <PaperClipIcon className="w-5 h-5 text-green-400" />
                        <h3 className="text-lg font-semibold text-white">Add Attachment</h3>
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

                <div className="space-y-4">
                    <div>
                        <label htmlFor="attachmentName" className="block text-sm font-medium text-gray-300 mb-2">
                            Attachment Name
                        </label>
                        <input
                            type="text"
                            id="attachmentName"
                            value={attachmentName}
                            onChange={(e) => setAttachmentName(e.target.value)}
                            placeholder="Enter attachment name..."
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label htmlFor="attachmentUrl" className="block text-sm font-medium text-gray-300 mb-2">
                            File URL
                        </label>
                        <input
                            type="url"
                            id="attachmentUrl"
                            value={attachmentUrl}
                            onChange={(e) => setAttachmentUrl(e.target.value)}
                            placeholder="https://example.com/file.pdf"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                        disabled={!attachmentName.trim() || !attachmentUrl.trim()}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
                    >
                        Save Attachment
                    </button>
                </div>
            </div>
        </ModalBackground>
    );
} 