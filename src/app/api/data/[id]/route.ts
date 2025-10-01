import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { auth } from '@clerk/nextjs/server';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * DELETE /api/data/:id
 * Deletes a data item by ID
 * Users can only delete their own data
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Get the nexus to verify ownership
    const nexus = await convex.query(api.queries.getNexusWithData, {
      nexusId: id as Id<'nexi'>,
      ownerId: userId,
    });

    if (!nexus) {
      return NextResponse.json(
        { error: 'Data not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this data
    if (nexus.ownerId && nexus.ownerId !== userId) {
      return NextResponse.json(
        { error: 'You cannot delete data from other users' },
        { status: 403 }
      );
    }

    // Delete the nexus
    await convex.mutation(api.mutations.deleteNexus, {
      nexusId: id as Id<'nexi'>,
    });

    return NextResponse.json({
      message: 'Data deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting data:', error);
    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500 }
    );
  }
}
