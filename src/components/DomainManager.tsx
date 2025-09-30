"use client";

import { useState } from "react";
import { KnowledgeDomain, DomainService } from "../lib/domainService";
import { useAuth } from "@clerk/nextjs";

interface DomainManagerProps {
    domains: KnowledgeDomain[];
    onDomainsChange: (domains: KnowledgeDomain[]) => void;
    onClose: () => void;
}

export default function DomainManager({ domains, onDomainsChange, onClose }: DomainManagerProps) {
    const { getToken } = useAuth();
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        category: "Programming",
        tags: "",
        isPublic: false
    });

    const handleCreateDomain = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Validate individual tag lengths
            const tagArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            const invalidTags = tagArray.filter(tag => tag.length > 20);

            if (invalidTags.length > 0) {
                alert(`The following tags exceed 20 characters: ${invalidTags.join(', ')}`);
                return;
            }

            const token = await getToken({ template: "convex" });
            const newDomain = await DomainService.createDomain({
                name: formData.name,
                description: formData.description,
                category: formData.category,
                tags: tagArray,
                isPublic: formData.isPublic
            }, token || undefined);

            if (newDomain) {
                onDomainsChange([...domains, newDomain]);
                setIsCreating(false);
                setFormData({
                    name: "",
                    description: "",
                    category: "Programming",
                    tags: "",
                    isPublic: false
                });
            }
        } catch (error) {
            console.error("Failed to create domain:", error);
        }
    };

    const handleDeleteDomain = async (domainId: string) => {
        if (confirm("Are you sure you want to delete this domain? This action cannot be undone.")) {
            try {
                const token = await getToken({ template: "convex" });
                const success = await DomainService.deleteDomain(domainId, token || undefined);
                if (success) {
                    onDomainsChange(domains.filter(d => d.id !== domainId));
                }
            } catch (error) {
                console.error("Failed to delete domain:", error);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">Knowledge Domains</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsCreating(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Create Domain
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Create Domain Form */}
                {isCreating && (
                    <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">Create New Domain</h3>
                        <form onSubmit={handleCreateDomain} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Domain Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Enter a descriptive name for your knowledge domain..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    rows={3}
                                    placeholder="Provide a detailed description of what this knowledge domain will contain..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option>Programming</option>
                                    <option>AI/ML</option>
                                    <option>Business</option>
                                    <option>Design</option>
                                    <option>Science</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Tags</label>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Enter comma-separated tags (e.g., react, javascript, frontend)"
                                    maxLength={200}
                                />
                                <div className="text-xs text-gray-400 mt-1">
                                    Individual tags should be 20 characters or less
                                </div>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isPublic"
                                    checked={formData.isPublic}
                                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                                    className="mr-2"
                                />
                                <label htmlFor="isPublic" className="text-sm">Make this domain public</label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    Create Domain
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Domains List */}
                <div className="space-y-4">
                    {domains.map((domain) => (
                        <div key={domain.id} className="bg-gray-700 p-4 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold text-lg">{domain.name}</h3>
                                    <p className="text-gray-400 text-sm">{domain.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!domain.isPublic && (
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    )}
                                    <button
                                        onClick={() => handleDeleteDomain(domain.id)}
                                        className="text-red-400 hover:text-red-300 p-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-400">
                                <div className="flex items-center gap-4">
                                    <span className="bg-gray-600 px-2 py-1 rounded">{domain.category}</span>
                                    <span>{domain.embeddingCount} entries</span>
                                    <span>Created {domain.createdAt.toLocaleDateString()}</span>
                                </div>
                                <div className="flex gap-1">
                                    {domain.tags.slice(0, 3).map((tag, index) => (
                                        <span key={index} className="bg-purple-600 px-2 py-1 rounded text-xs">
                                            {tag}
                                        </span>
                                    ))}
                                    {domain.tags.length > 3 && (
                                        <span className="bg-gray-600 px-2 py-1 rounded text-xs">
                                            +{domain.tags.length - 3}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 