"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { ChatMessage } from "../utils/openRouter";
import { Chunk, ChunkingService } from "../utils/chunking";
import { ChunkService } from "../lib/chunkService";
import { generateConversationTitle } from "../utils/titleGeneration";
import { Id } from "@convex/_generated/dataModel";
import ResearchChunkDisplay from "./ResearchChunkDisplay";
import LargeLoadingSpinner from "./LargeLoadingSpinner";
import { getMetaTagColorClasses } from "../utils/metaTagColors";
import PromptTemplateForm from "./PromptTemplateForm";
import TemplateConfigModal from "./TemplateConfigModal";
import MarkdownRenderer from "./MarkdownRenderer";

interface ChatInterfaceProps {
    selectedModel: string;
    onSendMessage?: (message: string, response: string) => void;
    onChunksCreated?: (chunks: Chunk[]) => void;
    nexusId?: Id<"nexi">;
    notebookId?: Id<"notebooks">;
    selectedTagId?: Id<"tags"> | null;
    className?: string;
    onSwitchToChat?: () => void;
    onNavigateToChunk?: (notebookId: Id<"notebooks">, chunkId: Id<"chunks">) => void;
}

export interface ChatInterfaceRef {
    processResponse: (response: string) => void;
    sendMessage: (message: string) => void;
}

const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(({ selectedModel, onSendMessage, onChunksCreated, nexusId, notebookId, selectedTagId, className = "", onSwitchToChat, onNavigateToChunk }, ref) => {

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [currentChunks, setCurrentChunks] = useState<Chunk[]>([]);
    const [showChunks, setShowChunks] = useState(false);
    const [currentMode, setCurrentMode] = useState<'chat' | 'prompts' | 'explore'>('chat');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
    const [chunkMetaTags, setChunkMetaTags] = useState<Record<string, string>>({});
    const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<Id<"conversations"> | null>(null);
  const { getToken } = useAuth();

    // Prompt template states
    const [selectedTemplate, setSelectedTemplate] = useState<{
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
    } | null>(null);
    const [isPromptTemplateFormOpen, setIsPromptTemplateFormOpen] = useState(false);
    const [isTemplateConfigModalOpen, setIsTemplateConfigModalOpen] = useState(false);

    // Fetch notebook data to get meta question
    const notebook = useQuery(api.queries.getNotebookById, notebookId ? { notebookId } : "skip");
    // Fetch meta tags for chunk saving (scoped to user)
    const { userId } = useAuth();
    const metaTags = useQuery(api.queries.getMetaTags, userId ? { ownerId: userId } : {});
    // User preferences (top/bottom placement)
    const me = useQuery(api.queries.getMe, {});
    // Fetch conversation history for current conversation
    const conversationData = useQuery(
        api.queries.getConversationById,
        currentConversationId ? { conversationId: currentConversationId } : "skip"
    );
    // Fetch prompt templates
    const promptTemplates = useQuery(api.queries.getActivePromptTemplates, userId ? { ownerId: userId } : {});

    // Get the EXPLORATORY meta tag ID for the explore functionality
    const exploratoryMetaTag = metaTags?.find(tag => tag.name === "EXPLORATORY");

    // Fetch chunks with EXPLORATORY meta tag for the explore view
    const exploratoryChunks = useQuery(
        api.queries.getChunksByMetaTag,
        exploratoryMetaTag && userId ? { metaTagId: exploratoryMetaTag._id, ownerId: userId } : "skip"
    );

    // Get notebook information for exploratory chunks
    const notebookIds = exploratoryChunks ? [...new Set(exploratoryChunks.map(chunk => chunk.notebookId))] : [];
    const notebooks = useQuery(
        api.queries.getNotebooksByIds,
        notebookIds.length > 0 ? { notebookIds } : "skip"
    );

    // Auto-resize textarea when input message changes
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [inputMessage]);

    // Mutations
    const createConversation = useMutation(api.mutations.createConversation);
    const addConversationMessage = useMutation(api.mutations.addConversationMessage);
    const incrementPromptTemplateUsage = useMutation(api.mutations.incrementPromptTemplateUsage);
    const assignTagsToChunk = useMutation(api.mutations.assignTagsToChunk);

    // Build conversation history from fetched conversation messages
    useEffect(() => {
        if (conversationData && conversationData.messages && conversationData.messages.length > 0) {
            const history: ChatMessage[] = [];

            // Convert conversation messages to chat messages
            conversationData.messages.forEach(message => {
                // Add user message
                history.push({
                    role: 'user',
                    content: message.question
                });

                // Add assistant response
                history.push({
                    role: 'assistant',
                    content: message.answer
                });
            });

            setConversationHistory(history);
        } else {
            setConversationHistory([]);
        }
    }, [conversationData]);

    // Handle template selection
    const handleTemplateSelect = (template: {
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
    }) => {
        setSelectedTemplate(template);
        setIsTemplateConfigModalOpen(true);
    };



    // Handle template execution from modal
    const handleExecuteTemplateFromModal = async (template: {
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
    }, inputs: Record<string, string>) => {
        // Process the template by replacing placeholders with user inputs
        let processedPrompt = template.templateContent;

        // Replace each placeholder with the corresponding user input
        if (template.placeholders) {
            template.placeholders.forEach((placeholder) => {
                const placeholderName = placeholder.name;
                const userValue = inputs[placeholderName] || placeholder.defaultValue || '';

                // Replace all occurrences of the placeholder in the template
                const placeholderRegex = new RegExp(`\\[${placeholderName}\\]`, 'g');
                processedPrompt = processedPrompt.replace(placeholderRegex, userValue);
            });
        }

        // Track template usage
        try {
            await incrementPromptTemplateUsage({ templateId: template._id });
        } catch (error) {
            console.error('Failed to increment template usage:', error);
        }

        // Execute the API call directly
        await executePrompt(processedPrompt);
    };

    // Execute prompt API call
    const executePrompt = async (prompt: string) => {
        console.log('executePrompt: Starting execution with prompt:', prompt.substring(0, 50) + '...');
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);

        try {
            const token = await getToken({ template: "convex" });
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    message: prompt,
                    model: selectedModel,
                    previous_history: conversationHistory.length > 0 ? conversationHistory : [],
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();

            // Create chunks from the response
            const chunkingResult = ChunkingService.chunkResponse(data.response, '', selectedModel);
            setCurrentChunks(chunkingResult.chunks);
            setShowChunks(true);
            setCurrentMode('chat'); // Switch to chat mode to show the response
            console.log('executePrompt: Switched to chat mode');

            // Optional: surface shard usage summary if returned in headers later (placeholder)

            // Update conversation history with the new exchange
            setConversationHistory(prev => [
                ...prev,
                { role: 'user', content: prompt },
                { role: 'assistant', content: data.response }
            ]);

            // Handle conversation saving logic
            if (notebookId) {
                try {
                    if (!currentConversationId) {
                        // Create a new conversation for this exchange
                        const title = await generateConversationTitle(
                            prompt,
                            { token: (await getToken({ template: "convex" })) || undefined }
                        );
                        const conversationId = await createConversation({
                            notebookId: notebookId,
                            title: title,
                            modelUsed: selectedModel,
                        });
                        setCurrentConversationId(conversationId);

                        // Add the current message to the conversation
                        await addConversationMessage({
                            conversationId,
                            question: prompt,
                            answer: data.response,
                        });
                    } else {
                        // Add to existing conversation
                        await addConversationMessage({
                            conversationId: currentConversationId,
                            question: prompt,
                            answer: data.response,
                        });
                    }
                } catch (error) {
                    console.error('Failed to save conversation:', error);
                }
            }

            // Call the callbacks if provided
            if (onSendMessage) {
                onSendMessage(prompt, data.response);
            }

            if (onChunksCreated) {
                onChunksCreated(chunkingResult.chunks);
            }

        } catch (error) {
            console.error('Error executing prompt:', error);
            // Show error in chunks area
            const errorChunk: Chunk = {
                id: `error_${typeof window !== 'undefined' ? Date.now() : 0}`,
                content: 'Sorry, I encountered an error while processing your prompt. Please try again.',
                chunkType: 'text',
                order: 0,
                source: 'System Error',
                createdAt: typeof window !== 'undefined' ? Date.now() : 0,
            };
            setCurrentChunks([errorChunk]);
            setShowChunks(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = useCallback(async (messageToSend?: string) => {
        const message = messageToSend || inputMessage.trim();
        if (!message || isLoading) return;

        if (!messageToSend) {
            setInputMessage("");
        }
        setIsLoading(true);

        try {
            const token = await getToken({ template: "convex" });
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    message: message,
                    model: selectedModel,
                    previous_history: conversationHistory,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 402) {
                    throw new Error(errorData.error || 'Insufficient shards. Please visit your Account settings to add more shards.');
                }
                throw new Error(errorData.error || `Failed to send message (${response.status})`);
            }

            const data = await response.json();

            // Create chunks from the response
            const chunkingResult = ChunkingService.chunkResponse(data.response, '', selectedModel);
            setCurrentChunks(chunkingResult.chunks);
            setShowChunks(true);

            // Update conversation history with the new exchange
            setConversationHistory(prev => [
                ...prev,
                { role: 'user', content: message },
                { role: 'assistant', content: data.response }
            ]);

            // Handle conversation saving logic
            if (notebookId) {
                try {
                    if (!currentConversationId) {
                        // Create a new conversation for this exchange
                        const title = await generateConversationTitle(
                            message,
                            { token: (await getToken({ template: "convex" })) || undefined }
                        );
                        const conversationId = await createConversation({
                            notebookId: notebookId,
                            title: title,
                            modelUsed: selectedModel,
                        });
                        setCurrentConversationId(conversationId);

                        // Add the current message to the conversation
                        await addConversationMessage({
                            conversationId,
                            question: message,
                            answer: data.response,
                        });
                    } else {
                        // Add to existing conversation
                        await addConversationMessage({
                            conversationId: currentConversationId,
                            question: message,
                            answer: data.response,
                        });
                    }
                } catch (error) {
                    console.error('Failed to save conversation:', error);
                }
            }

            // Call the callbacks if provided
            if (onSendMessage) {
                onSendMessage(message, data.response);
            }

            if (onChunksCreated) {
                onChunksCreated(chunkingResult.chunks);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            // Show error in chunks area
            const errorMessage = error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.';
            const errorChunk: Chunk = {
                id: `error_${typeof window !== 'undefined' ? Date.now() : 0}`,
                content: errorMessage,
                chunkType: 'text',
                order: 0,
                source: 'System Error',
                createdAt: typeof window !== 'undefined' ? Date.now() : 0,
            };
            setCurrentChunks([errorChunk]);
            setShowChunks(true);
        } finally {
            setIsLoading(false);
        }
    }, [inputMessage, isLoading, selectedModel, conversationHistory, notebookId, currentConversationId, createConversation, addConversationMessage, onSendMessage, onChunksCreated, getToken]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleButtonClick = () => {
        handleSendMessage();
    };

    // Function to process a response and create chunks (for loading from conversation history)
    const processResponse = useCallback((response: string) => {
        // Create chunks from the response
        const chunkingResult = ChunkingService.chunkResponse(response, '', selectedModel);
        setCurrentChunks(chunkingResult.chunks);
        setShowChunks(true);

        // Call the callback if provided
        if (onChunksCreated) {
            onChunksCreated(chunkingResult.chunks);
        }
    }, [selectedModel, onChunksCreated]);

    // Expose the processResponse function to parent component
    useImperativeHandle(ref, () => ({
        processResponse,
        sendMessage: handleSendMessage
    }), [processResponse, handleSendMessage]);

    const handleChunkEdit = (chunkId: string, newContent: string) => {
        setCurrentChunks(prev =>
            prev.map(chunk =>
                chunk.id === chunkId
                    ? { ...chunk, content: newContent }
                    : chunk
            )
        );
    };

    const handleChunkDelete = (chunkId: string) => {
        setCurrentChunks(prev => prev.filter(chunk => chunk.id !== chunkId));
    };

    // const handleChunkAdd = async (content: string, chunkType: "text" | "code") => {
    //     if (!notebookId) {
    //         setSaveStatus({
    //             type: 'error',
    //             message: 'No locus selected'
    //         });
    //         return;
    //     }

    //     // Simple formatting: convert inline lists to proper markdown lists
    //     // Handle the specific case: "text: -item1 -item2 -item3" -> "text:\n- item1\n- item2\n- item3"
    //     const formattedContent = content.replace(/([^-\n]*?):\s*(-[^-]+(?:-[^-]+)*)/g, (match, prefix, listItems) => {
    //         // Split by dashes that start words, but keep the content
    //         const items = listItems.split(/(?=\s-)/g).map((item: string) => item.trim()).filter((item: string) => item.length > 0);
    //         const formattedItems = items.map((item: string) => {
    //         // Remove leading dash and add proper markdown dash
    //         return '- ' + item.replace(/^-\s*/, '');
    //     });
    //     return `${prefix}:\n${formattedItems.join('\n')}`;
    // });

    //     const newChunk: Chunk = {
    //         id: `manual_${Date.now()}`,
    //         title: chunkType === "code" ? "Code Block" : "Text Block",
    //         content: formattedContent,
    //         chunkType: chunkType,
    //         order: currentChunks.length,
    //         source: 'Manual Entry',
    //         createdAt: Date.now(),
    //     };

    //     // Add to local state immediately for UI feedback
    //     setCurrentChunks(prev => [...prev, newChunk]);

    //     // Save to database
    //     try {
    //         // Get the first meta tag as default, or show error if none exist
    //         if (!metaTags || metaTags.length === 0) {
    //         setSaveStatus({
    //             type: 'error',
    //             message: 'No meta tags available. Please initialize meta tags first.'
    //         });
    //         return;
    //     }
    //     const defaultMetaTagId = metaTags[0]._id;
    //     const request = ChunkService.chunkToSaveRequest(newChunk, notebookId, defaultMetaTagId);
    //     const result = await ChunkService.saveChunk(request);

    //     if (result.success) {
    //         setSaveStatus({
    //             type: 'success',
    //             message: `Successfully added chunk "${newChunk.title}"`
    //         });
    //     } else {
    //         setSaveStatus({
    //             type: 'error',
    //             message: `Failed to save chunk: ${result.message}`
    //         });
    //         // Remove from local state if save failed
    //         setCurrentChunks(prev => prev.filter(c => c.id !== newChunk.id));
    //     }
    //     } catch (error) {
    //         setSaveStatus({
    //             type: 'error',
    //             message: `Failed to save chunk: ${error instanceof Error ? error.message : 'Unknown error'}`
    //         });
    //         // Remove from local state if save failed
    //         setCurrentChunks(prev => prev.filter(c => c.id !== newChunk.id));
    //     }
    // };

    const handleSaveChunks = async () => {
        if (!notebookId || currentChunks.length === 0) {
            setSaveStatus({
                type: 'error',
                message: 'No locus selected or no chunks to save'
            });
            return;
        }

        setIsSaving(true);
        setSaveStatus({ type: null, message: '' });

        try {
            // Validate meta tags are available
            if (!metaTags || metaTags.length === 0) {
                setSaveStatus({
                    type: 'error',
                    message: 'No meta tags available. Please initialize meta tags first.'
                });
                return;
            }

            // Filter chunks that have meta tags assigned
            const chunksToSave: Chunk[] = [];
            const chunkMetaTagIds: Record<string, string> = {};

            for (const chunk of currentChunks) {
                const selectedMetaTagName = chunkMetaTags[chunk.id];
                const selectedMetaTag = metaTags.find(tag => tag.name === selectedMetaTagName);

                if (selectedMetaTag) {
                    chunksToSave.push(chunk);
                    chunkMetaTagIds[chunk.id] = selectedMetaTag._id as string;
                }
            }

            // Check if there are any chunks to save
            if (chunksToSave.length === 0) {
                setSaveStatus({
                    type: 'error',
                    message: 'No chunks have meta tags assigned. Please assign meta tags to chunks before saving.'
                });
                return;
            }

            const result = await ChunkService.saveChunks(
                chunksToSave,
                notebookId,
                chunkMetaTagIds,
                await getToken({ template: "convex" }) || undefined,
                // Preserve original order when server inserts at top
                (me && 'researchChunkPlacement' in me ? me.researchChunkPlacement ?? 'top' : 'top') === 'top',
                'research'
            );

            if (result.success) {
                setSaveStatus({
                    type: 'success',
                    message: `Successfully saved ${result.savedCount} chunks to locus. ${currentChunks.length - chunksToSave.length} chunks remain unsaved (no meta tags assigned).`
                });

                // Remove only the saved chunks from the current list
                const savedChunkIds = new Set(chunksToSave.map(chunk => chunk.id));
                setCurrentChunks(prev => prev.filter(chunk => !savedChunkIds.has(chunk.id)));

                // Clear meta tags for saved chunks
                setChunkMetaTags(prev => {
                    const newMetaTags = { ...prev };
                    savedChunkIds.forEach(chunkId => {
                        delete newMetaTags[chunkId];
                    });
                    return newMetaTags;
                });

                // Hide chunks if none remain
                if (currentChunks.length - chunksToSave.length === 0) {
                    setShowChunks(false);
                }
            } else {
                setSaveStatus({
                    type: 'error',
                    message: `Saved ${result.savedCount} chunks, but encountered errors: ${result.errors.join(', ')}`
                });
            }
        } catch (error) {
            setSaveStatus({
                type: 'error',
                message: `Failed to save chunks: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveIndividualChunk = async (chunk: Chunk, metaTagId?: string, tagIds?: string[]) => {
        if (!notebookId) {
            setSaveStatus({
                type: 'error',
                message: 'No locus selected'
            });
            return;
        }

        setIsSaving(true);
        setSaveStatus({ type: null, message: '' });

        try {
            // Validate meta tags are available
            if (!metaTags || metaTags.length === 0) {
                setSaveStatus({
                    type: 'error',
                    message: 'No meta tags available. Please initialize meta tags first.'
                });
                return;
            }

            // Use the passed metaTagId if provided, otherwise find CORE meta tag as default
            let tagIdToUse = metaTagId;
            if (!tagIdToUse) {
                const coreMetaTag = metaTags.find(tag => tag.name === 'CORE');
                tagIdToUse = coreMetaTag?._id || metaTags[0]._id;
            }


            const request = {
                ...ChunkService.chunkToSaveRequest(chunk, notebookId, tagIdToUse),
                placementHint: 'research' as const,
            };
            const result = await ChunkService.saveChunk(
                request,
                await getToken({ template: "convex" }) || undefined
            );

            if (result.success) {
                // Assign tags to the chunk if any were selected
                if (tagIds && tagIds.length > 0) {
                    try {
                        await assignTagsToChunk({
                            chunkId: result.chunkId as Id<"chunks">,
                            tagIds: tagIds as Id<"tags">[]
                        });
                    } catch (error) {
                        console.error('Error assigning tags to chunk:', error);
                        // Don't fail the save operation if tag assignment fails
                    }
                }

                setSaveStatus({
                    type: 'success',
                    message: `Successfully saved chunk${tagIds && tagIds.length > 0 ? ` with ${tagIds.length} tag${tagIds.length !== 1 ? 's' : ''}` : ''}`
                });

                // Remove the saved chunk from the current list
                setCurrentChunks(prev => prev.filter(c => c.id !== chunk.id));
            }
        } catch (error) {
            setSaveStatus({
                type: 'error',
                message: `Failed to save chunk: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChunkTagsChange = async (chunkId: string, tagIds: string[]) => {
        console.log('Chunk tags changed:', chunkId, tagIds);

        // For now, we'll just log the changes
        // In a full implementation, you might want to:
        // 1. Update the chunk in local state with the new tags
        // 2. If the chunk is saved, update the database
        // 3. Trigger any UI updates needed

        // Update the current chunks with the new tag information
        setCurrentChunks(prev =>
            prev.map(chunk =>
                chunk.id === chunkId
                    ? { ...chunk, tags: tagIds }
                    : chunk
            )
        );
    };

    const handleChunkMetaTagChange = (chunkId: string, metaTagName: string) => {
        setChunkMetaTags(prev => ({
            ...prev,
            [chunkId]: metaTagName
        }));
    };

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentMode('chat')}
                        className={`px-3 py-1 rounded text-sm transition-colors ${currentMode === 'chat'
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:text-white"
                            }`}
                    >
                        Chat
                    </button>
                    <button
                        onClick={() => setCurrentMode('prompts')}
                        className={`px-3 py-1 rounded text-sm transition-colors ${currentMode === 'prompts'
                            ? "bg-yellow-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:text-white"
                            }`}
                    >
                        Prompts
                    </button>
                    <button
                        onClick={() => setCurrentMode('explore')}
                        className={`px-3 py-1 rounded text-sm transition-colors ${currentMode === 'explore'
                            ? "bg-purple-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:text-white"
                            }`}
                    >
                        Explore
                    </button>
                    {selectedTagId && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-900/20 border border-green-700 rounded text-xs text-green-400">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            Tag filtered
                        </div>
                    )}
                </div>

                {/* Save Button - Only show when there are chunks and a notebook is selected */}
                {currentMode === 'chat' && currentChunks.length > 0 && notebookId && (
                    <div className="flex items-center gap-2">
                        {/* Bulk Meta Tag Assignment */}
                        {metaTags && metaTags.length > 0 && (
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400">Bulk assign:</span>
                                {metaTags.map((tag) => (
                                    <button
                                        key={tag._id}
                                        onClick={() => {
                                            // Assign this meta tag to all current chunks
                                            currentChunks.forEach(chunk => {
                                                handleChunkMetaTagChange(chunk.id, tag.name);
                                            });
                                        }}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getMetaTagColorClasses(tag.displayColor, 'bg')} text-white hover:opacity-80`}
                                        title={`Assign ${tag.name} to all chunks`}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            onClick={handleSaveChunks}
                            disabled={isSaving}
                            // className=" text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                            className={`bg-gradient-to-br from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${isSaving ? "bg-gray-600 disabled:cursor-not-allowed opacity-60 pointer-events-none" : ""}`}
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                    </svg>
                                    Save Selected
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Save Status */}
            {saveStatus.type && (
                <div className={`px-4 py-2 text-sm ${saveStatus.type === 'success'
                    ? 'bg-green-900/20 text-green-400 border-b border-green-700'
                    : 'bg-red-900/20 text-red-400 border-b border-red-700'
                    }`}>
                    {saveStatus.message}
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {currentMode === 'prompts' ? (
                    <div className="p-4">
                        {!promptTemplates || promptTemplates.length === 0 ? (
                            <div className="text-center text-gray-400 mt-8">
                                <div className="text-2xl font-medium mb-2">No Prompt Templates</div>
                                <div className="text-base">No prompt templates are available yet.</div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Template Selection */}
                                <div>
                                    <h2 className="text-lg font-medium text-white mb-4">Select a Prompt Template</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Existing Templates */}
                                        {promptTemplates.map((template) => (
                                            <div
                                                key={template._id}
                                                onClick={() => handleTemplateSelect(template)}
                                                className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedTemplate?._id === template._id
                                                    ? 'border-yellow-500 bg-yellow-900/20'
                                                    : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xl">{template.icon || '📝'}</span>
                                                    <h3 className="font-medium text-white">{template.name}</h3>
                                                </div>
                                                <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                                                <div className="text-xs text-gray-500">
                                                    Used {template.usageCount || 0} times
                                                </div>
                                            </div>
                                        ))}

                                        {/* General Purpose Prompt Card */}
                                        <div
                                            onClick={() => setIsPromptTemplateFormOpen(true)}
                                            className="p-4 border-2 border-dashed border-gray-600 bg-gray-800 hover:border-purple-500 hover:bg-gray-700 cursor-pointer transition-all group"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xl group-hover:text-purple-400">✨</span>
                                                <h3 className="font-medium text-white group-hover:text-purple-400">General Purpose Prompt</h3>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-2">Catch-all for most other use cases</p>
                                            <div className="text-xs text-gray-500">
                                                Click to get started
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : currentMode === 'explore' ? (
                    <div className="p-4">
                        {!exploratoryChunks || exploratoryChunks.length === 0 ? (
                            <div className="text-center text-gray-400 mt-8">
                                <div className="text-2xl font-medium mb-2">Explore</div>
                                <div className="text-base mb-4">No exploratory chunks found. Assign the purple EXPLORATORY tag to chunks to see them here!</div>
                                <div className="text-sm text-gray-500 max-w-md mx-auto">
                                    <p className="mb-2">To add chunks to this view:</p>
                                    <ol className="text-left space-y-1">
                                        <li>1. Go to the Chat tab and generate some chunks</li>
                                        <li>2. Click the purple EXPLORATORY button on any chunk</li>
                                        <li>3. Save the chunks to see them appear here</li>
                                    </ol>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-2xl font-semibold text-white">Exploratory Chunks</h3>
                                        <span className="px-2 py-1 bg-purple-600 text-purple-100 text-xs font-medium rounded">
                                            {exploratoryChunks.length} chunk{exploratoryChunks.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        Brainstorming ideas, future trends, experimental concepts
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {exploratoryChunks.map((chunk) => (
                                        <div
                                            key={chunk._id}
                                            className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-colors cursor-pointer"
                                            onClick={() => {
                                                // Navigate to the notebook containing this chunk
                                                if (onNavigateToChunk) {
                                                    onNavigateToChunk(chunk.notebookId, chunk._id);
                                                } else if (onSwitchToChat) {
                                                    onSwitchToChat();
                                                }
                                            }}
                                            title="Click to view in notebook"
                                        >
                                            {/* Chunk Header */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 bg-purple-600 text-purple-100 text-xs font-medium rounded">
                                                        EXPLORATORY
                                                    </span>
                                                    {/* Title removed */}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    {notebooks && (
                                                        <span className="text-blue-400">
                                                            {notebooks.find(nb => nb?._id === chunk.notebookId)?.name || 'Unknown Notebook'}
                                                        </span>
                                                    )}
                                                    <span>{new Date(chunk.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            {/* Chunk Content */}
                                            <div className="text-gray-300 text-base mb-3">
                                                <MarkdownRenderer content={chunk.userEditedText || chunk.originalText} />
                                            </div>

                                            {/* Click indicator */}
                                            <div className="text-xs text-gray-500 hover:text-white transition-colors duration-200 flex items-center gap-1 cursor-pointer">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Click to view in notebook
                                            </div>

                                            {/* Tags */}
                                            {chunk.tags && chunk.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {chunk.tags.map((tag) => (
                                                        <span
                                                            key={tag._id}
                                                            className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                                                        >
                                                            {tag.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <LargeLoadingSpinner size={64} color="#8b5cf6" thickness={6} />
                                <div className="mt-4 text-gray-400 text-lg">Generating response...</div>
                            </div>
                        ) : (
                            <div className="p-4">
                                {!showChunks ? (
                                    <div className="text-center text-gray-400 mt-8">
                                        <div className="text-2xl font-medium mb-2">Start a conversation</div>
                                        <div className="text-base">Ask me anything to generate knowledge chunks.</div>
                                    </div>
                                ) : (
                                    <ResearchChunkDisplay
                                        chunks={currentChunks}
                                        selectedNotebookId={notebookId}
                                        selectedNexusId={nexusId}

                                        onChunkEdit={handleChunkEdit}
                                        onChunkDelete={handleChunkDelete}
                                        onChunkSave={notebookId ? handleSaveIndividualChunk : undefined}
                                        onChunkTagsChange={handleChunkTagsChange}
                                        onChunkMetaTagChange={handleChunkMetaTagChange}
                                        chunkMetaTags={chunkMetaTags}
                                    />
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Input Area - Always show in chat interface for followup questions */}
            {currentMode === 'chat' && (
                <div className="border-t border-gray-700 p-4">
                    <div className="flex justify-center">
                        <div className="w-full max-w-2xl">
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <textarea
                                        ref={textareaRef}
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder={currentChunks.length > 0 ? "Ask a followup question..." : (notebook?.metaQuestion || "Type your message...")}
                                        className={`w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent overflow-hidden ${notebook?.metaQuestion ? 'placeholder-gray-400/50' : 'placeholder-gray-400'}`}
                                        rows={1}
                                        disabled={isLoading}
                                        style={{ minHeight: '44px', maxHeight: '200px' }}
                                    />
                                </div>
                                <button
                                    onClick={handleButtonClick}
                                    disabled={!inputMessage.trim() || isLoading}
                                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Template Form Modal */}
            <PromptTemplateForm
                isOpen={isPromptTemplateFormOpen}
                onClose={() => setIsPromptTemplateFormOpen(false)}
                onExecutePrompt={async (prompt: string) => {
                    console.log('PromptTemplateForm: Executing prompt and switching to chat');
                    // Execute the generated prompt directly
                    await executePrompt(prompt);
                    // Switch to chat view to see the generated response
                    if (onSwitchToChat) {
                        console.log('PromptTemplateForm: Calling onSwitchToChat');
                        onSwitchToChat();
                    } else {
                        console.log('PromptTemplateForm: onSwitchToChat is not provided');
                    }
                }}
            />

            {/* Template Configuration Modal */}
            <TemplateConfigModal
                isOpen={isTemplateConfigModalOpen}
                onClose={() => {
                    setIsTemplateConfigModalOpen(false);
                    setSelectedTemplate(null);
                }}
                onExecuteTemplate={handleExecuteTemplateFromModal}
                template={selectedTemplate}
            />
        </div>
    );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface; 