"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import MarkdownRenderer from "./MarkdownRenderer";
import LargeLoadingSpinner from "./LargeLoadingSpinner";
import { generateConversationTitle } from "../utils/summarization";

interface ConversationHistoryProps {
    notebookId: Id<"notebooks">;
    onConversationSelect?: (conversationId: Id<"conversations">) => void;
    selectedConversationId?: Id<"conversations"> | null;
    onLoadAnswer?: (answer: string) => void;
    className?: string;
}

export default function ConversationHistory({
    notebookId,
    onConversationSelect,
    selectedConversationId,
    onLoadAnswer,
    className = ""
}: ConversationHistoryProps) {
    const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());
    const [summarizingConversations, setSummarizingConversations] = useState<Set<string>>(new Set());
    const [generatedTitles, setGeneratedTitles] = useState<Record<string, string>>({});

    // Get all conversations for this notebook
    const conversations = useQuery(api.queries.getConversationsByNotebook, { notebookId });

    // Get the selected conversation with its messages
    const selectedConversation = useQuery(
        api.queries.getConversationById,
        selectedConversationId ? { conversationId: selectedConversationId } : "skip"
    );

    const toggleConversation = (conversationId: string) => {
        const newExpanded = new Set(expandedConversations);
        if (newExpanded.has(conversationId)) {
            newExpanded.delete(conversationId);
        } else {
            newExpanded.add(conversationId);
        }
        setExpandedConversations(newExpanded);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const generateSummary = async (conversationId: string, firstQuestion: string) => {
        if (summarizingConversations.has(conversationId) || generatedTitles[conversationId]) {
            return;
        }

        setSummarizingConversations(prev => new Set(prev).add(conversationId));

        try {
            const summary = await generateConversationTitle(firstQuestion);
            setGeneratedTitles(prev => ({ ...prev, [conversationId]: summary }));
        } catch (error) {
            console.error('Failed to generate summary:', error);
            // Fallback to a simple title
            const words = firstQuestion.split(' ').slice(0, 6);
            const fallbackTitle = words.join(' ').replace(/[.,!?;:]$/, '');
            setGeneratedTitles(prev => ({ ...prev, [conversationId]: fallbackTitle }));
        } finally {
            setSummarizingConversations(prev => {
                const newSet = new Set(prev);
                newSet.delete(conversationId);
                return newSet;
            });
        }
    };

    // Show loading state while conversations are loading
    if (conversations === undefined) {
        return (
            <div className={`flex flex-col items-center justify-center p-12 ${className}`}>
                <LargeLoadingSpinner size={48} color="#8b5cf6" className="mb-4" />
                <div className="text-gray-400 text-sm">Loading conversations...</div>
            </div>
        );
    }

    if (!conversations || conversations.length === 0) {
        return (
            <div className={`p-4 text-gray-400 ${className}`}>
                <h3 className="text-lg font-semibold mb-2 text-white">Conversation History</h3>
                <p>No conversations yet. Start chatting to see your conversation history here.</p>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            <div>
                <h3 className="text-lg font-semibold text-white">Conversation History</h3>
                <p className="text-sm text-gray-500">Conversations will be automatically deleted after 7 days.</p>
            </div>

            <div className="space-y-3">
                {conversations.map((conversation) => {
                    const isExpanded = expandedConversations.has(conversation._id);
                    const isSelected = selectedConversationId === conversation._id;
                    const isSummarizing = summarizingConversations.has(conversation._id);
                    const generatedTitle = generatedTitles[conversation._id];

                    // Generate summary if conversation has no title and we have the selected conversation data
                    if (!conversation.title && selectedConversation && selectedConversation.conversation._id === conversation._id && selectedConversation.messages.length > 0) {
                        const firstQuestion = selectedConversation.messages[0].question;
                        if (!generatedTitle && !isSummarizing) {
                            generateSummary(conversation._id, firstQuestion);
                        }
                    }

                    const displayTitle = conversation.title || generatedTitle || (isSummarizing ? 'Generating title...' : `Research Session ${formatDate(conversation.createdAt)}`);

                    return (
                        <div
                            key={conversation._id}
                            className={`border rounded-lg overflow-hidden transition-all ${isSelected
                                ? 'border-blue-500 bg-gray-800'
                                : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                                }`}
                        >
                            {/* Conversation Header */}
                            <div
                                className="p-4 cursor-pointer hover:bg-gray-700 flex justify-between items-center transition-colors"
                                onClick={() => {
                                    toggleConversation(conversation._id);
                                    if (onConversationSelect) {
                                        onConversationSelect(conversation._id);
                                    }
                                }}
                            >
                                <div className="flex-1">
                                    <h4 className="font-medium text-white">
                                        {displayTitle}
                                    </h4>
                                    <p className="text-sm text-gray-400">
                                        {formatDate(conversation.createdAt)}
                                        {conversation.modelUsed && ` • ${conversation.modelUsed}`}
                                    </p>
                                </div>
                                <button
                                    className="text-gray-400 hover:text-white transition-colors p-1 rounded bg-transparent"
                                    aria-label={isExpanded ? "Collapse conversation" : "Expand conversation"}
                                >
                                    {isExpanded ? (
                                        <ChevronDownIcon className="w-5 h-5" />
                                    ) : (
                                        <ChevronRightIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* Conversation Messages */}
                            {isExpanded && selectedConversation && selectedConversation.conversation._id === conversation._id && (
                                <div className="p-4 space-y-4 bg-gray-900 border-t border-gray-700">
                                    {selectedConversation.messages.map((message, index) => (
                                        <div key={message._id} className="space-y-3">
                                            {/* Question */}
                                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                                <div className="text-sm font-medium text-blue-400 mb-2">Question {index + 1}:</div>
                                                <div className="text-gray-200">
                                                    <MarkdownRenderer content={message.question} />
                                                </div>
                                            </div>

                                            {/* Answer */}
                                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="text-sm font-medium text-green-400">Answer:</div>
                                                    {onLoadAnswer && (
                                                        <button
                                                            onClick={() => onLoadAnswer(message.answer)}
                                                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                                                            title="Load this answer into the chat interface for chunking"
                                                        >
                                                            Preserve Insights
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="text-gray-200">
                                                    <MarkdownRenderer content={message.answer} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
} 