interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatResponse {
  response: string;
  model: string;
  timestamp: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterRequestBody {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

interface ProviderErrorDetails {
  message?: string;
  code?: number | string;
  metadata?: { raw?: { retryable?: boolean } };
}

export class OpenRouterService {
  private static readonly API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  private static readonly DEFAULT_MODEL = 'openai/gpt-4o-mini';

  private static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Narrow unknown payloads from providers that sometimes wrap errors in a 200 body
  private static isRetryableProviderError(data: unknown): boolean {
    try {
      if (data && typeof data === 'object' && 'error' in data) {
        const envelope = data as { error?: ProviderErrorDetails };
        const err = envelope.error;
        if (err && typeof err === 'object') {
          const codeNumber = err.code !== undefined ? Number(err.code) : NaN;
          const retryableMeta = !!err.metadata?.raw?.retryable;
          return retryableMeta || (Number.isFinite(codeNumber) && codeNumber >= 500);
        }
      }
    } catch {
      // ignore
    }
    return false;
  }

  /**
   * Clean AI response by removing HCLI prompts and other unwanted content
   */
  private static cleanResponse(response: string): string {
    // Remove HCLI prompts and related content
    const cleaned = response
      // Remove HCLI: prompts and their output
      .replace(/HCLI:\s*[^\n]*\n?/gi, '')
      // Remove lines that start with "Executing" followed by CLI commands
      .replace(/^Executing\s+[^\n]*\n?/gim, '')
      // Remove lines with CLI args
      .replace(/^\s*with CLI args:.*\n?/gim, '')
      // Remove "Mapping to function call" lines
      .replace(/^Mapping to function call:.*\n?/gim, '')
      // Remove "Command 'x' queued for execution" lines
      .replace(/^Command\s+'[^']*'\s+queued for execution.*\n?/gim, '')
      // Remove check marks and CLI output patterns
      .replace(/^[✓√✔]\s*.*\(up\)\s*\n?/gim, '')
      // Remove [QUEUED] status lines
      .replace(/^\[QUEUED\].*\n?/gim, '')
      // Remove result sections that look like CLI output
      .replace(/^-+\s*RESULT\s*-+\s*\n?/gim, '')
      .replace(/^Result\s*\(bool\)\s*:\s*\n?/gim, '')
      .replace(/^True\s*\n?/gim, '')
      .replace(/^-+\s*\n?/gim, '')
      // Remove any remaining isolated "True" or "False" lines
      .replace(/^\s*(True|False)\s*$/gim, '')
      // Clean up multiple consecutive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace
      .trim();

    // If the response is empty or too short after cleaning, return a fallback
    if (!cleaned || cleaned.length < 10) {
      return "I apologize, but I encountered an issue processing your request. Please try rephrasing your question.";
    }

    return cleaned;
  }

  /**
   * Send a chat message to OpenRouter
   */
  static async sendMessage(
    message: string,
    model: string = this.DEFAULT_MODEL,
    systemPrompt?: string,
    temperature: number = 0.7
  ): Promise<ChatResponse> {
    console.log('=== OpenRouter sendMessage START ===');
    console.log('Model:', model);
    console.log('Message:', message);
    console.log('System prompt:', systemPrompt);
    console.log('Temperature:', temperature);

    try {
      const messages: ChatMessage[] = [];
      
      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      // Add user message
      messages.push({
        role: 'user',
        content: message
      });

      const requestBody: OpenRouterRequestBody = {
        model: model,
        messages: messages,
        temperature: temperature,
        stream: false
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      // Simple retry with exponential backoff for transient errors
      const maxAttempts = 3;
      let lastError: unknown = undefined;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await fetch(this.API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://nexus-tech.vercel.app', // Required by OpenRouter
              'X-Title': 'Nexus Tech' // Optional but recommended
            },
            cache: 'no-store',
            body: JSON.stringify(requestBody),
          });

          console.log('Response status:', response.status);
          console.log('Response headers:', Object.fromEntries(response.headers.entries()));

          const text = await response.text();
          const data = text ? JSON.parse(text) : {};
          console.log('Raw API response:', JSON.stringify(data, null, 2));

          if (!response.ok || this.isRetryableProviderError(data)) {
            const errPayload = data?.error ? JSON.stringify(data.error) : text;
            const statusForLog = response.status;
            const willRetry = attempt < maxAttempts;
            console.warn(`OpenRouter error (attempt ${attempt}/${maxAttempts}) status=${statusForLog} retryable=${this.isRetryableProviderError(data)} payload=${errPayload}`);
            if (willRetry) {
              const backoffMs = 400 * Math.pow(2, attempt - 1);
              await this.sleep(backoffMs);
              continue;
            }
            throw new Error(`OpenRouter API error: ${statusForLog} - ${errPayload}`);
          }

          // Extract the response from OpenRouter
          let aiResponse = 'No response generated';
          let usage = undefined;

          if (data.choices && data.choices.length > 0) {
            aiResponse = data.choices[0].message.content || '';
            usage = data.usage;
            console.log('AI Response:', aiResponse);
            console.log('Usage:', usage);
          } else if (data?.error) {
            // Non-retryable provider error
            throw new Error(`Provider error: ${JSON.stringify(data.error)}`);
          } else {
            console.error('No choices found in response:', data);
            throw new Error('No response generated');
          }

          const result = {
            response: this.cleanResponse(aiResponse),
            model: model,
            timestamp: new Date().toISOString(),
            usage: usage ? {
              prompt_tokens: usage.prompt_tokens || 0,
              completion_tokens: usage.completion_tokens || 0,
              total_tokens: usage.total_tokens || 0,
            } : undefined,
          };

          console.log('Final result:', result);
          console.log('=== OpenRouter sendMessage END ===');
          return result;
        } catch (err) {
          lastError = err;
          const willRetry = attempt < maxAttempts;
          console.warn(`sendMessage attempt ${attempt} failed. willRetry=${willRetry}. error=`, err);
          if (willRetry) {
            const backoffMs = 400 * Math.pow(2, attempt - 1);
            await this.sleep(backoffMs);
            continue;
          }
          throw err;
        }
      }

      // Should be unreachable
      throw lastError instanceof Error ? lastError : new Error('Unknown error');

    } catch (error) {
      console.error('OpenRouter service error:', error);
      console.log('=== OpenRouter sendMessage ERROR END ===');
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send a conversation with multiple messages
   */
  static async sendConversation(
    message: string,
    model: string = this.DEFAULT_MODEL,
    systemPrompt?: string,
    temperature: number = 0.7,
    previous_history: ChatMessage[] = []
  ): Promise<ChatResponse> {
    console.log('=== OpenRouter sendConversation START ===');
    console.log('Model:', model);
    console.log('Message:', message);
    console.log('System prompt:', systemPrompt);
    console.log('Temperature:', temperature);
    console.log('Previous history length:', previous_history.length);

    try {
      const messages: ChatMessage[] = [];

      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      // Add previous conversation history (filter out any empty messages)
      previous_history.forEach(msg => {
        if (msg.content && msg.content.trim()) {
          messages.push(msg);
        }
      });

      // Add current user message
      messages.push({
        role: 'user',
        content: message
      });

      console.log('Final messages array:', JSON.stringify(messages, null, 2));

      const requestBody: OpenRouterRequestBody = {
        model: model,
        messages: messages,
        temperature: temperature,
        stream: false
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      // Simple retry with exponential backoff for transient errors
      const maxAttempts = 3;
      let lastError: unknown = undefined;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await fetch(this.API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://nexus-tech.vercel.app', // Required by OpenRouter
              'X-Title': 'Nexus Tech' // Optional but recommended
            },
            cache: 'no-store',
            body: JSON.stringify(requestBody),
          });

          console.log('Response status:', response.status);
          console.log('Response headers:', Object.fromEntries(response.headers.entries()));

          const text = await response.text();
          const data = text ? JSON.parse(text) : {};
          console.log('Raw API response:', JSON.stringify(data, null, 2));

          if (!response.ok || this.isRetryableProviderError(data)) {
            const errPayload = data?.error ? JSON.stringify(data.error) : text;
            const statusForLog = response.status;
            const willRetry = attempt < maxAttempts;
            console.warn(`OpenRouter error (attempt ${attempt}/${maxAttempts}) status=${statusForLog} retryable=${this.isRetryableProviderError(data)} payload=${errPayload}`);
            if (willRetry) {
              const backoffMs = 400 * Math.pow(2, attempt - 1);
              await this.sleep(backoffMs);
              continue;
            }
            throw new Error(`OpenRouter API error: ${statusForLog} - ${errPayload}`);
          }

          // Extract the response from OpenRouter
          let aiResponse = 'No response generated';
          let usage = undefined;

          if (data.choices && data.choices.length > 0) {
            aiResponse = data.choices[0].message.content || '';
            usage = data.usage;
            console.log('AI Response:', aiResponse);
            console.log('Usage:', usage);
          } else if (data?.error) {
            // Non-retryable provider error
            throw new Error(`Provider error: ${JSON.stringify(data.error)}`);
          } else {
            console.error('No choices found in response:', data);
            throw new Error('No response generated');
          }

          const result = {
            response: this.cleanResponse(aiResponse),
            model: model,
            timestamp: new Date().toISOString(),
            usage: usage ? {
              prompt_tokens: usage.prompt_tokens || 0,
              completion_tokens: usage.completion_tokens || 0,
              total_tokens: usage.total_tokens || 0,
            } : undefined,
          };

          console.log('Final result:', result);
          console.log('=== OpenRouter sendConversation END ===');

          return result;
        } catch (err) {
          lastError = err;
          const willRetry = attempt < maxAttempts;
          console.warn(`sendConversation attempt ${attempt} failed. willRetry=${willRetry}. error=`, err);
          if (willRetry) {
            const backoffMs = 400 * Math.pow(2, attempt - 1);
            await this.sleep(backoffMs);
            continue;
          }
          throw err;
        }
      }

      // Should be unreachable
      throw lastError instanceof Error ? lastError : new Error('Unknown error');

    } catch (error) {
      console.error('OpenRouter service error:', error);
      console.log('=== OpenRouter sendConversation ERROR END ===');
      throw new Error(`Failed to send conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Summarize text using OpenRouter
   */
  static async summarizeText(text: string): Promise<string> {
    console.log('=== OpenRouter summarizeText START ===');
    console.log('Text to summarize:', text.substring(0, 100) + '...');

    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise summaries. Summarize the given text in 5-12 words.'
        },
        {
          role: 'user',
          content: `Summarize the following question in 5-12 words: ${text}`
        }
      ];

      const requestBody: OpenRouterRequestBody = {
        model: 'openai/gpt-4o-mini',
        messages: messages,
        temperature: 0.3,
        max_tokens: 50,
        stream: false
      };

      console.log('Summarize request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nexus-tech.vercel.app',
          'X-Title': 'Nexus Tech'
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Summarize response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Summarize API error:', errorText);
        throw new Error("Failed to summarize text");
      }
      
      const data: OpenRouterResponse = await response.json();
      console.log('Summarize raw response:', JSON.stringify(data, null, 2));

      if (data.choices && data.choices.length > 0) {
        const summary = data.choices[0].message.content || '';
        console.log('Summary result:', summary);
        console.log('=== OpenRouter summarizeText END ===');
        return summary;
      } else {
        console.error("No summary found in response:", data);
        throw new Error("No summary found in response");
      }
    } catch (error) {
      console.error('Summarize error:', error);
      console.log('=== OpenRouter summarizeText ERROR END ===');
      throw error;
    }
  }
}

export type { ChatMessage, ChatResponse };

// Export the summarization function for direct use
export const summarizeText = OpenRouterService.summarizeText;
