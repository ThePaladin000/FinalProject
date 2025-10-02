import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { auth } from '@clerk/nextjs/server';

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const body = await request.json();
    const {
      locusId,
      originalText,
      userEditedText,
      source,
      chunkType = "text",
      metaTagId,
      placementHint: placementHintFromClient
    } = body;

    // metaTagId is optional; server will default to CORE if missing
    if (!locusId || !originalText) {
      return NextResponse.json({
        error: 'Locus ID and original text are required'
      }, { status: 400 });
    }

    // Decide placement behavior:
    // - If client specifies placementHint, use it
    // - Else if source === "import", treat as import
    // - Otherwise default to "add"
    type PlacementHint = 'add' | 'import' | 'research';
    const placementHint: PlacementHint =
      placementHintFromClient === 'add' || placementHintFromClient === 'import' || placementHintFromClient === 'research'
        ? placementHintFromClient
        : (source === 'import' ? 'import' : 'add');

    // Call the actual Convex mutation
    const chunkId = await convex.mutation(api.mutations.createChunk, {
      notebookId: locusId,
      originalText,
      userEditedText,
      source,
      chunkType,
      metaTagId: metaTagId || undefined,
      ownerId: userId,
      placementHint,
    });

    console.log('Created chunk with ID:', chunkId);

    return NextResponse.json({
      chunkId,
      success: true,
      message: 'Chunk created successfully'
    });

  } catch (error) {
    console.error('Chunks API error:', error);
    return NextResponse.json(
      { error: `Failed to create chunk: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      chunkId,
      originalText,
      userEditedText,
      source,
      chunkType,
      metaTagId
    } = body;

    if (!chunkId) {
      return NextResponse.json({
        error: 'Chunk ID is required'
      }, { status: 400 });
    }

    // Call the actual Convex mutation
    await convex.mutation(api.mutations.updateChunk, {
      chunkId,
      originalText,
      userEditedText,
      source,
      chunkType,
      metaTagId: metaTagId || undefined,
    });

    console.log('Updated chunk:', chunkId);

    return NextResponse.json({
      success: true,
      message: 'Chunk updated successfully'
    });

  } catch (error) {
    console.error('Chunks API error:', error);
    return NextResponse.json(
      { error: 'Failed to update chunk' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chunkId = searchParams.get('chunkId');

    if (!chunkId) {
      return NextResponse.json({
        error: 'Chunk ID is required'
      }, { status: 400 });
    }

    // Call the actual Convex mutation
    await convex.mutation(api.mutations.deleteChunk, {
      chunkId: chunkId as Id<"chunks">,
    });

    console.log('Deleted chunk:', chunkId);

    return NextResponse.json({
      success: true,
      message: 'Chunk deleted successfully'
    });

  } catch (error) {
    console.error('Chunks API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete chunk' },
      { status: 500 }
    );
  }
}
