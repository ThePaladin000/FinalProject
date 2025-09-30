import React, { useState } from 'react';

interface PromptTemplateFormProps {
    isOpen: boolean;
    onClose: () => void;
    onExecutePrompt: (prompt: string) => Promise<void>;
}

export default function PromptTemplateForm({ isOpen, onClose, onExecutePrompt }: PromptTemplateFormProps) {
    const [formData, setFormData] = useState({
        // 1. Core request
        coreRequest: '',

        // 2. Format & Style
        outputFormats: {
            simpleExplanation: false,
            numberedList: false,
            comparison: false,
            stepByStep: false,
            creative: false,
            formalReport: false,
            other: ''
        },

        // 3. Audience & Goal
        audienceAndGoal: ''
    });

    const [isExecuting, setIsExecuting] = useState(false);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleFormatChange = (format: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            outputFormats: {
                ...prev.outputFormats,
                [format]: checked
            }
        }));
    };

    const handleOtherFormatChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            outputFormats: {
                ...prev.outputFormats,
                other: value
            }
        }));
    };

    const generatePrompt = () => {
        // Build format instructions based on selected options
        const formatInstructions = [];

        if (formData.outputFormats.simpleExplanation) {
            formatInstructions.push('Provide a clear and concise explanation, focusing on core facts.');
        }
        if (formData.outputFormats.numberedList) {
            formatInstructions.push('Present the information in an easy-to-read numbered or bulleted list.');
        }
        if (formData.outputFormats.comparison) {
            formatInstructions.push('Compare and contrast the relevant entities, ideally using a table or clear prose sections.');
        }
        if (formData.outputFormats.stepByStep) {
            formatInstructions.push('Provide step-by-step instructions.');
        }
        if (formData.outputFormats.creative) {
            formatInstructions.push('Generate a creative or narrative response (e.g., a story, poem, or imaginative text).');
        }
        if (formData.outputFormats.formalReport) {
            formatInstructions.push('Structure the response as a professional and formal report.');
        }
        if (formData.outputFormats.other) {
            formatInstructions.push(`Additionally, present the output as a ${formData.outputFormats.other}.`);
        }

        // If no formats selected, provide a default instruction
        if (formatInstructions.length === 0) {
            formatInstructions.push('Provide the information in a clear and helpful format.');
        }

        const prompt = `**Your Role:** You are a helpful, knowledgeable, and adaptable AI assistant.

**Task:**
${formData.coreRequest}

**Output Requirements:**
*   **Format & Style:**
${formatInstructions.map(instruction => `    *   ${instruction}`).join('\n')}

*   **Audience & Purpose:**
    *   The information is intended for: ${formData.audienceAndGoal || 'general users'}. Please tailor the language, depth, and examples accordingly.

**Important:** Ensure the response is accurate, relevant, and directly addresses the user's request. Maintain a helpful and clear tone.`;

        return prompt;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsExecuting(true);

        try {
            const prompt = generatePrompt();
            await onExecutePrompt(prompt);

            // Reset form
            setFormData({
                coreRequest: '',
                outputFormats: {
                    simpleExplanation: false,
                    numberedList: false,
                    comparison: false,
                    stepByStep: false,
                    creative: false,
                    formalReport: false,
                    other: ''
                },
                audienceAndGoal: ''
            });

            onClose();
        } catch (error) {
            console.error('Failed to execute prompt:', error);
            alert('Failed to execute prompt');
        } finally {
            setIsExecuting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-white">Generate Custom Prompt</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 1. What do you want to know or achieve? */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            1. What do you want to know or achieve? (Your core request)
                        </label>
                        <p className="text-sm text-gray-400 mb-2">
                            e.g., &quot;Explain quantum entanglement,&quot; &quot;Compare agile vs. waterfall methodologies,&quot; &quot;Write a short story about a brave knight.&quot;
                        </p>
                        <textarea
                            value={formData.coreRequest}
                            onChange={(e) => handleInputChange('coreRequest', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            rows={3}
                            placeholder="Describe what you want to know or achieve... (e.g., 'Explain quantum entanglement', 'What is the difference between LLMs and RAGs?')"
                            required
                        />
                    </div>

                    {/* 2. How should the information be presented? */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            2. How should the information be presented? (Format & Style)
                        </label>
                        <p className="text-sm text-gray-400 mb-2">
                            Check all that apply, or describe briefly.
                        </p>
                        <div className="space-y-3">
                            {Object.entries({
                                simpleExplanation: '**Simple Explanation:** Just give me the facts.',
                                numberedList: '**Numbered/Bulleted List:** Easy-to-read points.',
                                comparison: '**Comparison (Table/Prose):** Show differences and similarities.',
                                stepByStep: '**Step-by-Step Guide:** Instructions on how to do something.',
                                creative: '**Creative/Narrative:** A story, poem, or imaginative text.',
                                formalReport: '**Formal Report:** Structured, professional document.'
                            }).map(([key, label]) => (
                                <label key={key} className="flex items-start space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={formData.outputFormats[key as keyof typeof formData.outputFormats] as boolean}
                                        onChange={(e) => handleFormatChange(key, e.target.checked)}
                                        className="mt-1 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-300">{label}</span>
                                </label>
                            ))}
                            <div className="mt-3">
                                <label className="block text-sm font-medium text-white mb-2">
                                    **Other:** (Short description)
                                </label>
                                <input
                                    type="text"
                                    value={formData.outputFormats.other}
                                    onChange={(e) => handleOtherFormatChange(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Enter your custom format (e.g., Short summary, Dialogue, Q&A format)"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. Who is the information for, or what's its purpose? */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            3. Who is the information for, or what&apos;s its purpose? (Audience & Goal)
                        </label>
                        <p className="text-sm text-gray-400 mb-2">
                            e.g., &quot;A beginner learning about physics,&quot; &quot;My team deciding on a project methodology,&quot; &quot;For a bedtime story for my child.&quot;
                        </p>
                        <textarea
                            value={formData.audienceAndGoal}
                            onChange={(e) => handleInputChange('audienceAndGoal', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            rows={3}
                            placeholder="Describe your target audience and purpose (e.g., 'A beginner learning about physics', 'My team deciding on a project methodology')"
                        />
                    </div>

                    {/* Execute Prompt Button */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isExecuting || !formData.coreRequest.trim()}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {isExecuting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Executing...
                                </>
                            ) : (
                                'Execute Prompt'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 