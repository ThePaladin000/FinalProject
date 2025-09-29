import { Chunk } from "../utils/chunking";

export interface SaveChunkRequest {
  locusId: string;
  originalText: string;
  userEditedText?: string;
  source?: string;
  chunkType: "text" | "code" | "document";
  metaTagId: string;
  // optional hint for server placement preferences
  placementHint?: "add" | "import" | "research";
}

export interface UpdateChunkRequest {
  chunkId: string;
  originalText?: string;
  userEditedText?: string;
  source?: string;
  chunkType?: "text" | "code" | "document";
  metaTagId?: string;
}

export class ChunkService {
  /**
   * Save a new chunk to a locus
   */
  static async saveChunk(
    request: SaveChunkRequest,
    token?: string
  ): Promise<{ chunkId: string; success: boolean; message: string }> {
    try {
      const response = await fetch('/api/chunks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save chunk');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving chunk:', error);
      throw error;
    }
  }

  /**
   * Update an existing chunk
   */
  static async updateChunk(
    request: UpdateChunkRequest,
    token?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/chunks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update chunk');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating chunk:', error);
      throw error;
    }
  }

  /**
   * Delete a chunk
   */
  static async deleteChunk(
    chunkId: string,
    token?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`/api/chunks?chunkId=${chunkId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete chunk');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting chunk:', error);
      throw error;
    }
  }

  /**
   * Save multiple chunks to a locus
   */
  static async saveChunks(
    chunks: Chunk[],
    locusId: string,
    chunkMetaTagIds: Record<string, string>,
    token?: string,
    insertAtTop?: boolean,
    placementHint?: "add" | "import" | "research"
  ): Promise<{ success: boolean; savedCount: number; errors: string[] }> {
    const results = {
      success: true,
      savedCount: 0,
      errors: [] as string[]
    };

    // When the server places new items at the top, saving multiple chunks in
    // natural order would invert their final order (last saved appears first).
    // To preserve the original sequence (first chunk ends up at the top),
    // iterate in reverse when inserting at top.
    const iterable = insertAtTop ? [...chunks].reverse() : chunks;

    for (const chunk of iterable) {
      try {
        // Get the meta tag ID for this specific chunk, or use the first available meta tag as fallback
        const metaTagId = chunkMetaTagIds[chunk.id];
        
        if (!metaTagId) {
          results.errors.push(`No meta tag ID found for chunk "${chunk.id}"`);
          continue;
        }

        const request: SaveChunkRequest = {
          locusId,
          originalText: chunk.content,
          source: chunk.source,
          chunkType: chunk.chunkType,
          metaTagId,
          placementHint,
        };

        await this.saveChunk(request, token);
        results.savedCount++;
      } catch (error) {
        results.success = false;
        results.errors.push(`Failed to save chunk "${chunk.id}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Convert a Chunk object to SaveChunkRequest
   */
  static chunkToSaveRequest(chunk: Chunk, locusId: string, metaTagId: string): SaveChunkRequest {
    return {
      locusId,
      originalText: chunk.content,
      source: chunk.source,
      chunkType: chunk.chunkType,
      metaTagId,
    };
  }

  /**
   * Convert a Chunk object to UpdateChunkRequest
   */
  static chunkToUpdateRequest(chunk: Chunk): UpdateChunkRequest {
    return {
      chunkId: chunk.id,
      originalText: chunk.content,
      source: chunk.source,
      chunkType: chunk.chunkType,
    };
  }
} 