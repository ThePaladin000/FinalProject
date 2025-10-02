import { NextRequest, NextResponse } from 'next/server';

// Pinecone disabled for now - advanced feature to be implemented later

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { embedding } = body;

    if (!embedding || !Array.isArray(embedding)) {
      return NextResponse.json({ error: 'Valid embedding is required' }, { status: 400 });
    }

    // Pinecone disabled - return empty array for now
    const entries: Array<{
      id: string;
      domainId: string;
      content: string;
      embedding: number[];
      metadata: {
        title: string;
        source: string;
        type: 'text' | 'code' | 'document';
        tags: string[];
        createdAt: Date;
      };
    }> = [];

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error searching domains:', error);
    return NextResponse.json({ error: 'Failed to search domains' }, { status: 500 });
  }
}
