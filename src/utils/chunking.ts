export interface Chunk {
  id: string;
  content: string;
  chunkType: 'text' | 'code' | 'document';
  order: number;
  source: string;
  createdAt: number;
  tags?: string[]; // Add tags property for tag assignments
}

export interface ChunkingResult {
  chunks: Chunk[];
  totalChunks: number;
}

/**
 * Simple chunking utility that segments text by paragraphs and headers
 */
export class ChunkingService {
  /**
   * Chunk a response into meaningful segments
   */
  static chunkResponse(
    response: string,
    source: string = 'Eden AI',
    modelUsed: string = 'unknown'
  ): ChunkingResult {
    const chunks: Chunk[] = [];
    const now = Date.now();
    
    // Split by double newlines to get paragraphs
    const paragraphs = response.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let order = 0;
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (trimmedParagraph.length === 0) continue;
      
      // Determine chunk type
      const { chunkType } = this.analyzeChunk(trimmedParagraph);
      
      // Skip very short chunks (likely just formatting)
      if (trimmedParagraph.length < 20) continue;
      
      // Simple formatting: convert inline lists to proper markdown lists
      // Handle the specific case: "text: -item1 -item2 -item3" -> "text:\n- item1\n- item2\n- item3"
      const formattedContent = trimmedParagraph.replace(/([^-\n]*?):\s*(-[^-]+(?:-[^-]+)*)/g, (match, prefix, listItems) => {
        // Split by dashes that start words, but keep the content
        const items = listItems.split(/(?=\s-)/g).map((item: string) => item.trim()).filter((item: string) => item.length > 0);
        const formattedItems = items.map((item: string) => {
          // Remove leading dash and add proper markdown dash
          return '- ' + item.replace(/^-\s*/, '');
        });
        return `${prefix}:\n${formattedItems.join('\n')}`;
      });
      
      const chunk: Chunk = {
        id: `chunk_${now}_${order}`,
        content: formattedContent,
        chunkType,
        order,
        source: source ? `${source} (${modelUsed})` : modelUsed,
        createdAt: now,
      };
      
      chunks.push(chunk);
      order++;
    }
    
    return {
      chunks,
      totalChunks: chunks.length,
    };
  }
  
  /**
   * Analyze a chunk to determine its type
   */
  private static analyzeChunk(content: string): { chunkType: 'text' | 'code' | 'document' } {
    const trimmed = content.trim();
    
    // Check if it's a header (starts with # or is all caps)
    if (trimmed.startsWith('#') || trimmed.startsWith('**') || /^[A-Z\s]+$/.test(trimmed)) {
      return {
        chunkType: 'document',
      };
    }
    
    // Check if it's code (contains code-like patterns)
    if (trimmed.includes('```') || 
        trimmed.includes('function') || 
        trimmed.includes('const ') || 
        trimmed.includes('let ') || 
        trimmed.includes('var ') ||
        trimmed.includes('import ') ||
        trimmed.includes('export ')) {
      return {
        chunkType: 'code',
      };
    }
    
    // Default to text
    return {
      chunkType: 'text',
    };
  }


  

  


  /**
   * Get a summary of chunking results
   */
  static getChunkingSummary(result: ChunkingResult): string {
    const typeCounts = result.chunks.reduce((acc, chunk) => {
      acc[chunk.chunkType] = (acc[chunk.chunkType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const summary = Object.entries(typeCounts)
      .map(([type, count]) => `${count} ${type} chunk${count !== 1 ? 's' : ''}`)
      .join(', ');
    
    return `Created ${result.totalChunks} chunks: ${summary}`;
  }
} 