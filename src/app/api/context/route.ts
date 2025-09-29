import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { auth } from '@clerk/nextjs/server';

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    // Use nextUrl to support relative request URLs (e.g., when called via server-side fetch('/api/...'))
    const searchParams = request.nextUrl.searchParams;
    const nexusId = searchParams.get('nexusId');
    const notebookId = searchParams.get('notebookId');

    if (!nexusId) {
      return NextResponse.json({ error: 'Nexus ID is required' }, { status: 400 });
    }

    // For authenticated users, forward Convex token for owner-scoped data
    if (getToken) {
      try {
        const token = await getToken({ template: 'convex' });
        if (token) convex.setAuth(token.startsWith('Bearer ') ? token.slice(7) : token);
      } catch (error) {
        console.error('Failed to get Convex token:', error);
      }
    }

    // Fetch nexus data from Convex
    const nexus = await convex.query(api.queries.getNexusWithData, {
      nexusId: nexusId as Id<"nexi">,
      // When userId is not present, omit ownerId to allow access to shared/public nexus
      ownerId: userId || undefined,
    });

    if (!nexus) {
      return NextResponse.json({ error: 'Nexus not found' }, { status: 404 });
    }

    // If notebookId is provided, find the specific notebook
    let notebook = null;
    if (notebookId && nexus.notebooks) {
      notebook = nexus.notebooks.find(n => n._id === notebookId);
    }

  return NextResponse.json(
    { nexus, notebook },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=300",
      },
    }
  );

  } catch (error) {
    console.error('Context API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch context' },
      { status: 500 }
    );
  }
} 