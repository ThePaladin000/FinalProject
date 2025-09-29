import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Pinecone disabled for now - advanced feature to be implemented later

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domainId, entries } = body;

    if (!domainId || !entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Domain ID and entries array are required' }, { status: 400 });
    }

    // Ensure user is authenticated
    await requireAuth();

    // Pinecone disabled - just return success without storing
    return NextResponse.json({ success: true, count: entries.length });
  } catch (error) {
    console.error('Error adding entries to domain:', error);
    return NextResponse.json({ error: 'Failed to add entries to domain' }, { status: 500 });
  }
} 