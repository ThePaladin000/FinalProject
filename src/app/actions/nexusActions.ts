"use server";

import { NexusContext } from "../../lib/nexusService";
import { revalidatePath, revalidateTag } from "next/cache";
import { tagForNexus } from "@/server/data/nexus";

export async function getNexusContext(nexusId: string): Promise<NexusContext | null> {
  try {
    // Call the context API to get real data
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/context?nexusId=${nexusId}`, {
      // Server Action: in Next.js App Router, Clerk auth on server sets auth() context; token header optional
      headers: {},
    });
    
    if (!response.ok) {
      console.error('Failed to fetch nexus context:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    // Transform the data to match NexusContext interface
    const nexusContext: NexusContext = {
      nexus: {
        _id: data.nexus._id,
        name: data.nexus.name,
        description: data.nexus.description
      },
      loci: [
        {
          _id: "locus_1",
          name: "Getting Started",
          description: "Basic concepts and setup",
          metaQuestion: "How do I get started with this technology?",
          tags: [
            {
              _id: "tag_1",
              name: "basics",
              description: "Fundamental concepts",
              color: "#3B82F6"
            }
          ],
          chunks: [
            {
              _id: "chunk_1",
              title: "Introduction",
              originalText: "This is an introduction to the technology. It covers the basic concepts and provides a foundation for understanding more advanced topics.",
              chunkType: "text",
              source: "User Input"
            }
          ]
        }
      ]
    };
    
    return nexusContext;
  } catch (error) {
    console.error('Error fetching nexus context:', error);
    return null;
  }
}

export async function getNotebookContext(notebookId: string): Promise<{ name: string; metaQuestion?: string } | null> {
  try {
    // Call the context API to get notebook data
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/context?notebookId=${notebookId}`, {
      headers: {},
    });
    
    if (!response.ok) {
      console.error('Failed to fetch notebook context:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.notebook) {
      return null;
    }
    
    return {
      name: data.notebook.name,
      metaQuestion: data.notebook.metaQuestion
    };
  } catch (error) {
    console.error('Error fetching notebook context:', error);
    return null;
  }
}

// Call this after any mutation that changes the nexus header/context
export async function revalidateNexusContext(nexusId: string, affectedPaths: string[] = []): Promise<void> {
  try {
    revalidateTag(tagForNexus(nexusId));
    for (const p of affectedPaths) {
      revalidatePath(p);
    }
  } catch (error) {
    console.error('Failed to revalidate nexus context:', error);
  }
}

export async function createEnhancedSystemPrompt(
  basePrompt: string,
  nexusId: string,
  notebookId?: string
): Promise<string> {
  // Get nexus context
  const nexusContext = await getNexusContext(nexusId);
  
  // Get notebook context if notebookId is provided
  let notebookContext = null;
  if (notebookId) {
    notebookContext = await getNotebookContext(notebookId);
  }
  
  if (!nexusContext) {
    return basePrompt;
  }
  
  // Create the specific system prompt format requested by the user
  let enhancedPrompt = `You are an advanced AI assistant contributing to a user's personalized knowledge base within Nexus. Your task is to provide a comprehensive and highly relevant answer to the user's query.

**Context for Your Response:**
- The user query is about this topic: \`${nexusContext.nexus.name}\`.`;
  
  if (notebookContext) {
    enhancedPrompt += `
- This query is part of a Notebook focused on the overarching question: \`${notebookContext.metaQuestion || 'No specific question defined'}\`.`;
  }
  
  enhancedPrompt += `

**User's Query:** \`[USER_QUERY]\`

**Instructions:**
1. Answer the \`User's Query\` directly and comprehensively.
2. Ensure your response is highly relevant to the context of the \`${nexusContext.nexus.name}\`${notebookContext ? ` and \`${notebookContext.metaQuestion || 'No specific question defined'}\`` : ''}.
3. Structure your response clearly using paragraphs, subheadings, and lists to facilitate easy chunking later.
4. Maintain a helpful and informative tone.

${basePrompt}`;

  return enhancedPrompt;
} 