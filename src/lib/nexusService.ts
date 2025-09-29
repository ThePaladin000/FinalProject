
export interface NexusContext {
  nexus: {
    _id: string;
    name: string;
    description?: string;
  };
      loci: Array<{
    _id: string;
    name: string;
    description?: string;
    metaQuestion?: string;
    tags: Array<{
      _id: string;
      name: string;
      description?: string;
      color?: string;
    }>;
    chunks: Array<{
      _id: string;
      title?: string;
      originalText: string;
      userEditedText?: string;
      chunkType: "text" | "code" | "document";
      source?: string;
      metaTag?: {
        _id: string;
        name: string;
        displayColor: "BLUE" | "GREEN" | "YELLOW" | "RED" | "PURPLE";
        description: string;
      };
    }>;
  }>;
}

export class NexusService {
  /**
   * Get complete nexus context including notebooks, tags, and chunks
   */
  static async getNexusContext(nexusId: string): Promise<NexusContext | null> {
    try {
      // This would be called from a server action or API route
      // For now, we'll return a mock structure
      // TODO: Implement actual Convex query call
      console.log('Getting nexus context for:', nexusId);
      
      return null;
    } catch (error) {
      console.error('Error fetching nexus context:', error);
      return null;
    }
  }

  /**
   * Create a system prompt enhanced with nexus context
   */
  static createEnhancedSystemPrompt(
    basePrompt: string,
    nexusContext: NexusContext
  ): string {
    let enhancedPrompt = basePrompt + "\n\n";

    // Add nexus information
    enhancedPrompt += `You are chatting about the knowledge nexus: "${nexusContext.nexus.name}"`;
    if (nexusContext.nexus.description) {
      enhancedPrompt += `\nNexus description: ${nexusContext.nexus.description}`;
    }

    // Add locus context
    if (nexusContext.loci.length > 0) {
      enhancedPrompt += "\n\nAvailable knowledge areas:\n";
      nexusContext.loci.forEach((locus, index) => {
        enhancedPrompt += `${index + 1}. ${locus.name}`;
        if (locus.description) {
          enhancedPrompt += ` - ${locus.description}`;
        }
        if (locus.metaQuestion) {
          enhancedPrompt += `\n   Key question: ${locus.metaQuestion}`;
        }
        enhancedPrompt += "\n";
      });
    }

    // Add relevant chunks as context
    const allChunks = nexusContext.loci.flatMap(locus => 
      locus.chunks.map(chunk => ({
        ...chunk,
        locusName: locus.name
      }))
    );

    if (allChunks.length > 0) {
      enhancedPrompt += "\n\nRelevant knowledge chunks:\n";
      allChunks.forEach((chunk, index) => {
        enhancedPrompt += `--- Chunk ${index + 1} (${chunk.locusName}) ---\n`;
        enhancedPrompt += `Content: ${chunk.userEditedText || chunk.originalText}\n\n`;
      });
    }

    enhancedPrompt += "\nUse this context to provide informed, relevant responses. If the user's question relates to specific knowledge in this nexus, reference the appropriate chunks and loci.";

    return enhancedPrompt;
  }

  /**
   * Search for relevant chunks within a nexus
   */
  static searchNexusChunks(
    nexusContext: NexusContext,
    searchTerm: string
  ): Array<{ chunk: NexusContext['loci'][0]['chunks'][0] & { locusName: string }; relevance: number }> {
    const searchLower = searchTerm.toLowerCase();
    const results: Array<{ chunk: NexusContext['loci'][0]['chunks'][0] & { locusName: string }; relevance: number }> = [];

    nexusContext.loci.forEach(locus => {
      locus.chunks.forEach(chunk => {
        let relevance = 0;
        const content = (chunk.userEditedText || chunk.originalText).toLowerCase();

        // Simple relevance scoring
        if (content.includes(searchLower)) relevance += 1;
        
        // Boost relevance for exact matches
        if (content.includes(searchTerm)) relevance += 2;

        if (relevance > 0) {
          results.push({
            chunk: { ...chunk, locusName: locus.name },
            relevance
          });
        }
      });
    });

    // Sort by relevance and return top results
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5); // Return top 5 most relevant chunks
  }
} 