import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { auth } from '@clerk/nextjs/server';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/data
 * Returns all data saved by the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user's nexi (this serves as the user's data)
    const nexi = await convex.query(api.queries.getNexi, { ownerId: userId });

    return NextResponse.json({
      message: 'Success',
      data: nexi,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data
 * Creates a new data item for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Create new nexus (data item)
    const nexusId = await convex.mutation(api.mutations.createNexus, {
      name: name.trim(),
      description: description || '',
    });

    return NextResponse.json(
      {
        message: 'Data saved successfully',
        data: { _id: nexusId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating data:', error);
    return NextResponse.json(
      { error: 'Failed to create data' },
      { status: 500 }
    );
  }
}
