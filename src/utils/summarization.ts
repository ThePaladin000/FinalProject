/**
* Client-side summarization utility functions (OpenRouter-backed)
 */

export const summarizeText = async (text: string, token?: string): Promise<string> => {
  try {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        text,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to summarize text');
    }

    const data = await response.json();

    // Our API returns a `summary` string when successful
    if (typeof data.summary === 'string' && data.summary.trim().length > 0) {
      return data.summary.trim();
    }

    console.error('No summary found in response:', data);
    throw new Error('No summary found in response');
  } catch (error) {
    console.error('Summarization error:', error);
    // Fallback to a simple, concise title derived from the text
    const words = text.split(' ').slice(0, 6);
    const fallbackTitle = words.join(' ').replace(/[.,!?;:]$/, '');
    return fallbackTitle;
  }
};

/**
 * Generate a conversation title from the first question
 */
export const generateConversationTitle = async (firstQuestion: string, token?: string): Promise<string> => {
  return summarizeText(firstQuestion, token);
};