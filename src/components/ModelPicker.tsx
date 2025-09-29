"use client";

import { useState, useMemo } from "react";
import { allModels as allAvailableModels, type Model } from "../utils/models";
import { useAuth } from "@clerk/nextjs";

const availableModels: Model[] = allAvailableModels;

interface ModelPickerProps {
    selectedModel: string;
    onModelChange: (modelId: string) => void;
    className?: string;
    // Optional whitelist of model ids user has enabled (max 5 in settings)
    allowedModels?: string[];
}

export default function ModelPicker({ selectedModel, onModelChange, className = "", allowedModels }: ModelPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { isSignedIn } = useAuth();

    const filteredModels = useMemo(() => {
        const base = (Array.isArray(allowedModels)
            ? availableModels.filter(m => allowedModels.includes(m.id))
            : availableModels);
        const constrained = isSignedIn ? base : base.filter(m => m.creditCost === 0);
        return constrained.slice().sort((a, b) => a.creditCost - b.creditCost || a.name.localeCompare(b.name));
    }, [allowedModels, isSignedIn]);

    const selectedModelData = filteredModels.find(model => model.id === selectedModel) || filteredModels[0];

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-white text-sm px-3 py-2 rounded bg-gradient-to-br from-purple-500 to-green-500 hover:from-purple-600 hover:to-green-600 transition-colors shadow-lg"
            >
                <div className="inline-flex items-center gap-2">
                    <span className="font-medium">{selectedModelData?.name || "Select Model"}</span>
                    <svg
                        className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {filteredModels.map((model) => (
                        <button
                            key={model.id}
                            onClick={() => {
                                onModelChange(model.id);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors ${selectedModel === model.id ? 'bg-purple-600 text-white' : 'text-gray-300'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{model.name}</div>
                                    <div className="text-xs text-gray-400 mt-1">{model.description}</div>
                                </div>
                                <div className="text-xs text-gray-500 ml-2">
                                    {model.creditCost} credit{model.creditCost !== 1 ? 's' : ''}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
} 