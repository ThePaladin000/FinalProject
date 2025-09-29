import 'server-only';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { auth } from '@clerk/nextjs/server';

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Small server data module for fetching Nexus context for RSC usage
// - Auth handled directly via Clerk
// - Uses Next.js caching with tags so client islands can revalidate

export type NexusHeaderDTO = {
  nexus: {
    id: string;
    name: string;
    description?: string;
  };
  notebook?: {
    id: string;
    name: string;
    metaQuestion?: string;
  } | null;
};

/**
 * Fetches server-authenticated nexus context and returns a small, typed DTO
 * suitable for React Server Components. Response is cached and tagged by nexus.
 */
export async function fetchNexusHeader(
  nexusId: string,
  notebookId?: string
): Promise<NexusHeaderDTO> {
  try {
    const { userId, getToken } = await auth();
    
    // For authenticated users, forward Convex token for owner-scoped data
    if (getToken) {
      try {
        const token = await getToken({ template: 'convex' });
        if (token) convex.setAuth(token.startsWith('Bearer ') ? token.slice(7) : token);
      } catch (error) {
        console.error('Failed to get Convex token:', error);
      }
    }

    // Use getNexusWithData to fetch the specific nexus with proper permissions
    // When userId is not present, omit ownerId to allow access to shared/public nexus
    const nexus = await convex.query(api.queries.getNexusWithData, {
      nexusId: nexusId as Id<"nexi">,
      ownerId: userId || undefined,
    });
    
    if (!nexus) {
      const userType = userId ? `user ${userId}` : 'unauthenticated user';
      console.error(`Nexus ${nexusId} not found or access denied for ${userType}`);
      return {
        nexus: { id: nexusId, name: 'Unknown Nexus' },
        notebook: null,
      };
    }

    // Find the specific notebook if requested
    let notebook = null;
    if (notebookId && nexus.notebooks) {
      notebook = nexus.notebooks.find((n) => n._id === notebookId);
    }

    return {
      nexus: {
        id: String(nexus._id),
        name: nexus.name,
        description: nexus.description,
      },
      notebook: notebook
        ? {
            id: String(notebook._id),
            name: notebook.name,
            metaQuestion: notebook.metaQuestion,
          }
        : null,
    };
  } catch (error) {
    console.error(`Exception in fetchNexusHeader for ${nexusId}:`, error);
    return {
      nexus: { id: nexusId, name: 'Unknown Nexus' },
      notebook: null,
    };
  }
}

export function tagForNexus(nexusId: string): string {
  return `nexus:${nexusId}`;
}


