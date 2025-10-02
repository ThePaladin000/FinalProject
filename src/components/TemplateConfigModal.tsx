import React, { useState } from 'react';
import { Id } from '@convex/_generated/dataModel';

interface TemplateConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExecuteTemplate: (template: {
        _id: Id<"promptTemplates">;
        name: string;
        description: string;
        templateContent: string;
        icon?: string;
        placeholders?: Array<{
            name: string;
            label: string;
            type: 'text' | 'number' | 'textarea' | 'dropdown';
            defaultValue?: string;
            options?: string[];
            optional?: boolean;
            description?: string;
        }>;
        usageCount?: number;
    }, inputs: Record<string, string>) => Promise<void>;
    template: {
        _id: Id<"promptTemplates">;
        name: string;
        description: string;
        templateContent: string;
        icon?: string;
        placeholders?: Array<{
            name: string;
            label: string;
            type: 'text' | 'number' | 'textarea' | 'dropdown';
            defaultValue?: string;
            options?: string[];
            optional?: boolean;
            description?: string;
        }>;
        usageCount?: number;
    } | null;
}

export default function TemplateConfigModal({ isOpen, onClose, onExecuteTemplate, template }: TemplateConfigModalProps) {
    const [templateInputs, setTemplateInputs] = useState<Record<string, string>>({});
    const [isExecuting, setIsExecuting] = useState(false);

    const handleTemplateInputChange = (placeholderName: string, value: string) => {
        setTemplateInputs(prev => ({
            ...prev,
            [placeholderName]: value
        }));
    };

    const handleExecuteTemplate = async () => {
        if (!template) return;

        setIsExecuting(true);
        try {
            await onExecuteTemplate(template, templateInputs);
            setTemplateInputs({});
            onClose();
        } catch (error) {
            console.error('Failed to execute template:', error);
            alert('Failed to execute template');
        } finally {
            setIsExecuting(false);
        }
    };

    if (!isOpen || !template) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-white">Configure Template</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Template Info */}
                    <div className="border border-gray-600 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{template.icon || '📝'}</span>
                            <h3 className="text-lg font-medium text-white">{template.name}</h3>
                        </div>
                        <p className="text-gray-400">{template.description}</p>
                    </div>

                    {/* Placeholder Inputs */}
                    {template.placeholders && template.placeholders.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="font-medium text-white">Fill in the details:</h4>
                            {template.placeholders.map((placeholder) => (
                                <div key={placeholder.name} className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-300">
                                        {placeholder.label}
                                        {!placeholder.optional && <span className="text-red-400 ml-1">*</span>}
                                    </label>
                                    {placeholder.description && (
                                        <p className="text-xs text-gray-500">{placeholder.description}</p>
                                    )}
                                    {placeholder.type === 'textarea' ? (
                                        <textarea
                                            value={templateInputs[placeholder.name] || ''}
                                            onChange={(e) => handleTemplateInputChange(placeholder.name, e.target.value)}
                                            placeholder={placeholder.defaultValue || `Enter ${placeholder.label.toLowerCase()}`}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                            rows={3}
                                        />
                                    ) : placeholder.type === 'dropdown' && placeholder.options ? (
                                        <select
                                            value={templateInputs[placeholder.name] || ''}
                                            onChange={(e) => handleTemplateInputChange(placeholder.name, e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                        >
                                            <option value="">Select {placeholder.label.toLowerCase()}</option>
                                            {placeholder.options.map((option: string) => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={placeholder.type === 'number' ? 'number' : 'text'}
                                            value={templateInputs[placeholder.name] || ''}
                                            onChange={(e) => handleTemplateInputChange(placeholder.name, e.target.value)}
                                            placeholder={placeholder.defaultValue || `Enter ${placeholder.label.toLowerCase()}`}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Execute Button */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleExecuteTemplate}
                            disabled={isExecuting}
                            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {isExecuting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Executing...
                                </>
                            ) : (
                                'Execute Template'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 