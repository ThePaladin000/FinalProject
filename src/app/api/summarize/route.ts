import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { auth } from '@clerk/nextjs/server';
import { allModels } from '@/utils/models';

export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    try {
      const token = await getToken({ template: 'convex' });
      if (token) convex.setAuth(token.startsWith('Bearer ') ? token.slice(7) : token);
    } catch {}

    const body = await request.json();
    const { text } = body as { text?: string };

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Pre-check shards balance (only for paid models)
    // Since this endpoint always uses a free model, we don't need to check balance
    // The shard debit will only happen if there's an actual cost

    // Make request to OpenRouter summarization API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nexus-tech.vercel.app',
        'X-Title': 'Nexus Tech'
      },
                     body: JSON.stringify({
          model: 'openai/gpt-oss-20b:free',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that creates concise summaries. Summarize the given text in 5-12 words.'
            },
            {
              role: 'user',
              content: `Summarize the following question in 5-12 words: ${text}`
            }
          ],
          temperature: 0.3,
          max_tokens: 50,
          stream: false
        }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      
      // If it's a credits error or any other error, generate a fallback title
      console.warn('OpenRouter API failed, generating fallback title');
      
      // Generate a simple fallback title
      const words = text.split(' ').slice(0, 6); // Take first 6 words
      const fallbackTitle = words.join(' ').replace(/[.,!?;:]$/, ''); // Remove trailing punctuation
      
      return NextResponse.json({
        summary: fallbackTitle,
        timestamp: new Date().toISOString(),
        isFallback: true
      });
    }

    const data = await response.json();
    console.log('OpenRouter raw response:', JSON.stringify(data, null, 2));
    
    // Extract the summary from the response
    let summary = null;
    
    // OpenRouter uses the standard OpenAI format
    if (data.choices && data.choices.length > 0) {
      summary = data.choices[0].message.content;
    }
    
    if (!summary) {
      console.error("No summary found in response:", data);
      // Generate fallback title
      const words = text.split(' ').slice(0, 6);
      const fallbackTitle = words.join(' ').replace(/[.,!?;:]$/, '');
      
      return NextResponse.json({
        summary: fallbackTitle,
        timestamp: new Date().toISOString(),
        isFallback: true
      });
    }
    
    // Compute shard cost and attempt debit (non-fatal) only for signed-in users
    if (userId) {
      try {
        const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
        const promptTokens = usage?.prompt_tokens ?? 0;
        const completionTokens = usage?.completion_tokens ?? 0;
        const model = 'openai/gpt-oss-20b:free';
        const local = allModels.find(m => m.id === model || m.model === model);
        const convexPricing = await convex.query(api.queries.getModelPricing, { modelId: model }).catch(() => null);
        const pIn = (local?.inputTokenCostPerMillion ?? convexPricing?.inputTokenCostPerMillion ?? 0);
        const pOut = (local?.outputTokenCostPerMillion ?? convexPricing?.outputTokenCostPerMillion ?? 0);
        const MARKUP = 1.0;
        const inputShards = (promptTokens / 1_000_000) * pIn;
        const outputShards = (completionTokens / 1_000_000) * pOut;
        const totalShardCost = (inputShards + outputShards) * MARKUP;
        if (totalShardCost > 0) {
          await convex.mutation(api.mutations.debitShards, {
            userId,
            totalShardCost,
            reason: `Summarize: ${model}`,
            inputTokensUsed: promptTokens,
            outputTokensUsed: completionTokens,
            modelIdUsed: model,
          });
        }
      } catch (e) {
        console.warn('Shard debit (summarize) warning:', e);
      }
    }

    return NextResponse.json({
      summary: summary,
      timestamp: new Date().toISOString(),
      isFallback: false
    });

  } catch (error) {
    console.error('Summarize API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process summarization request' },
      { status: 500 }
    );
  }
} 