/**
 * Utility functions for generating conversation titles using the OpenRouter-backed summarization API
 */

export interface TitleGenerationOptions {
  token?: string;
}

/**
 * Generate a concise title for a conversation based on the first message
 * @param message The first message in the conversation
 * @param options Configuration options for the summarization
 * @returns A concise title for the conversation
 */
export async function generateConversationTitle(
  message: string,
  options: TitleGenerationOptions = {}
): Promise<string> {
  const { token } = options;

  try {
    if (message.length <= 50) {
      return message;
    }

    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      console.warn('Failed to generate title via summarization, using fallback');
      return generateFallbackTitle(message);
    }

    const data = await response.json();

    // Expect a `summary` string from the API
    let title = typeof data.summary === 'string' ? data.summary : '';

    if (!title) {
      console.warn('Unexpected summarization response format:', data);
      return generateFallbackTitle(message);
    }

    title = title.trim();
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }
    if (!title) {
      return generateFallbackTitle(message);
    }
    return title;
  } catch (error) {
    console.error('Error generating conversation title:', error);
    return generateFallbackTitle(message);
  }
}

/**
 * Generate a fallback title when summarization fails
 * @param message The original message
 * @returns A concise title
 */
export function generateFallbackTitle(message: string): string {
  // Remove common prefixes and clean up the message
  let cleanedMessage = message.trim();
  
  // Remove common prefixes
  const prefixesToRemove = [
    'explain', 'what is', 'how does', 'tell me about', 'describe', 
    'analyze', 'discuss', 'compare', 'contrast', 'summarize'
  ];
  
  for (const prefix of prefixesToRemove) {
    if (cleanedMessage.toLowerCase().startsWith(prefix.toLowerCase())) {
      cleanedMessage = cleanedMessage.substring(prefix.length).trim();
      break;
    }
  }
  
  // Remove punctuation at the beginning
  cleanedMessage = cleanedMessage.replace(/^[.,!?;:]+/, '').trim();
  
  // If the cleaned message is still too long, truncate it
  if (cleanedMessage.length > 60) {
    // Try to find a good breaking point (end of a word)
    const truncated = cleanedMessage.substring(0, 60);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 40) {
      cleanedMessage = truncated.substring(0, lastSpace) + '...';
    } else {
      cleanedMessage = truncated + '...';
    }
  }
  
  // If we have a meaningful title, use it
  if (cleanedMessage.length > 10) {
    return cleanedMessage;
  }
  
  // Final fallback
  return `Research: ${message.substring(0, 40)}...`;
}

/**
 * Generate a title for a conversation based on multiple messages
 * @param messages Array of messages in the conversation
 * @param options Configuration options for the summarization
 * @returns A concise title for the conversation
 */
export async function generateConversationTitleFromHistory(
  messages: Array<{ role: string; content: string }>,
  options: TitleGenerationOptions = {}
): Promise<string> {
  if (!messages || messages.length === 0) {
    return 'New Conversation';
  }

  // Use the first user message for title generation
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  if (firstUserMessage) {
    return generateConversationTitle(firstUserMessage.content, options);
  }

  // Fallback if no user message found
  return 'New Conversation';
} 