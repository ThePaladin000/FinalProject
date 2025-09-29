import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getCurrentUser } from '@/lib/auth';
import { KnowledgeDomain } from '@/lib/domainService';

// Pinecone disabled for now - advanced feature to be implemented later

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'user' or 'public'
    
    // Get authenticated user ID
    const userId = await getCurrentUser();
    
    if (type !== 'public' && !userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Pinecone disabled - return empty array for now
    const domains: KnowledgeDomain[] = [];

    return NextResponse.json(domains);
  } catch (error) {
    console.error('Error fetching domains:', error);
    return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, category, tags, isPublic } = body;

    if (!name || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get authenticated user ID
    const ownerId = await requireAuth();

    const domainId = `domain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Pinecone disabled - just return the domain object without storing
    const newDomain = {
      id: domainId,
      name,
      description,
      category: category || 'Other',
      tags: tags || [],
      isPublic: isPublic || false,
      embeddingCount: 0,
      createdAt: new Date(),
      ownerId
    };

    return NextResponse.json(newDomain);
  } catch (error) {
    console.error('Error creating domain:', error);
    return NextResponse.json({ error: 'Failed to create domain' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const domainId = searchParams.get('domainId');

    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    // Pinecone disabled - just return success without actually deleting
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting domain:', error);
    return NextResponse.json({ error: 'Failed to delete domain' }, { status: 500 });
  }
} 