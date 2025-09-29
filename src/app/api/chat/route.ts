import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterService } from '../../../utils/openRouter';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { auth } from '@clerk/nextjs/server';
import { allModels } from '@/utils/models';

// Ensure this route is always dynamic and never cached/prefetched
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  console.log('=== Chat API Route START ===');
  
  try {
    // Auth and Convex client setup
    const { userId, getToken } = await auth();
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    try {
      const token = await getToken({ template: 'convex' });
      if (token) convex.setAuth(token.startsWith('Bearer ') ? token.slice(7) : token);
    } catch {}

    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const { 
      message, 
      model = 'openai/gpt-4o-mini',
      systemPrompt,
      temperature = 0.7,
      previous_history = [], // Add conversation history
      useMock = false // Add mock mode for testing
    } = body;

    console.log('Extracted parameters:');
    console.log('- message:', message);
    console.log('- model:', model);
    console.log('- systemPrompt:', systemPrompt);
    console.log('- temperature:', temperature);
    console.log('- previous_history length:', previous_history.length);
    console.log('- useMock:', useMock);

    if (!message) {
      console.error('Missing message parameter');
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Mock response for testing when Eden AI credits are not available
    if (useMock === true) {
      console.log('Using mock response');
      const mockResponse = `This is a mock response for testing. You asked: "${message}"

I'm simulating an AI response about RAG chatbots. Here's what I would typically say:

RAG (Retrieval-Augmented Generation) chatbots combine the power of large language models with external knowledge retrieval. They work by:

1. **Retrieval**: Searching through a knowledge base for relevant information
2. **Augmentation**: Adding that information to the prompt
3. **Generation**: Using the enhanced prompt to generate a response

This approach helps reduce hallucinations and provides more accurate, up-to-date information.

Model used: ${model}
Timestamp: ${new Date().toISOString()}`;

      const mockResult = {
        response: mockResponse,
        model: model,
        timestamp: new Date().toISOString(),
        usage: {
          prompt_tokens: message.length,
          completion_tokens: mockResponse.length,
          total_tokens: message.length + mockResponse.length,
        },
        isMock: true
      };

      console.log('Mock result:', mockResult);
      console.log('=== Chat API Route END (Mock) ===');
      return NextResponse.json(mockResult);
    }

    // Get model info first to check if it's free
    const modelInfo = allModels.find(m => m.id === model || m.model === model);
    if (!modelInfo) {
      return NextResponse.json({ error: 'Invalid model specified.' }, { status: 400 });
    }

    // Pre-check shards balance (only for paid models)
    let balance = 0;
    if (userId && modelInfo.creditCost > 0) {
      const me = await convex.query(api.queries.getMe, {});
      balance = me?.shardBalance ?? 0;
      if (balance <= 0) {
        return NextResponse.json({ error: 'Insufficient Shards. Please upgrade or purchase more.' }, { status: 402 });
      }
    }

    console.log('Calling OpenRouterService.sendConversation...');
    
    // Enforce model restrictions for guests: only allow free models (creditCost === 0)
    if (!userId) {
      if (modelInfo.creditCost !== 0) {
        return NextResponse.json({ error: 'Guests may only use free models.' }, { status: 403 });
      }
    }

    // Use our OpenRouter service with conversation history
    const result = await OpenRouterService.sendConversation(
      message,
      model,
      systemPrompt || "You are a helpful AI assistant.",
      temperature,
      previous_history
    );
    
    // Compute shard cost using usage and model pricing
    const usage = result.usage;
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;

    // Pricing source priority: local models list -> Convex llmModels -> hardcoded default
    const convexPricing = await convex.query(api.queries.getModelPricing, { modelId: model }).catch(() => null);
    const pIn = (modelInfo.inputTokenCostPerMillion ?? convexPricing?.inputTokenCostPerMillion ?? 0.15);
    const pOut = (modelInfo.outputTokenCostPerMillion ?? convexPricing?.outputTokenCostPerMillion ?? 0.60);
    const MARKUP = 1.0; // adjust for margin if desired
    const inputShards = (promptTokens / 1_000_000) * pIn;
    const outputShards = (completionTokens / 1_000_000) * pOut;
    const totalShardCost = (inputShards + outputShards) * MARKUP;

    // Attempt debit atomically (only for paid models)
    if (userId && totalShardCost > 0) {
      try {
        await convex.mutation(api.mutations.debitShards, {
          userId,
          totalShardCost,
          reason: `LLM call: ${model}`,
          inputTokensUsed: promptTokens,
          outputTokensUsed: completionTokens,
          modelIdUsed: model,
        });
      } catch (e) {
        console.error('Shard debit failed:', e);
        return NextResponse.json({ error: 'Insufficient Shards. Please upgrade or purchase more.' }, { status: 402 });
      }
    }

    console.log('OpenRouterService result:', result);
    console.log('=== Chat API Route END (Success) ===');
    return NextResponse.json(result);

  } catch (error) {
    console.error('=== Chat API Route ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // If it's a credits error, return a helpful message
    if (error instanceof Error && error.message.includes('402')) {
      console.log('Detected 402 credits error');
      return NextResponse.json({
        error: 'OpenRouter credits required',
        message: 'Please add credits to your OpenRouter account to use this feature.',
        suggestion: 'Try adding ?useMock=true to test the interface'
      }, { status: 402 });
    }
    
    console.log('=== Chat API Route END (Error) ===');
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 