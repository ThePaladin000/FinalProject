// import { Pinecone } from '@pinecone-database/pinecone';

// Pinecone disabled for now - advanced feature to be implemented later
// const pinecone = new Pinecone({
//   apiKey: process.env.NEXT_PUBLIC_PINECONE_API_KEY!,
// });

export interface KnowledgeDomain {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  embeddingCount: number;
  lastQueryAt?: Date;
  createdAt: Date;
  ownerId: string;
}

export interface DomainEntry {
  id: string;
  domainId: string;
  content: string;
  embedding: number[];
  metadata: {
    title?: string;
    source?: string;
    type?: 'text' | 'code' | 'document';
    tags?: string[];
    createdAt: Date;
  };
}

export class PineconeService {
  private index: null;

  constructor() {
    // Pinecone disabled - no index initialization
    this.index = null;
  }

  // Create a new knowledge domain
  async createDomain(domain: Omit<KnowledgeDomain, 'id' | 'embeddingCount' | 'createdAt'>): Promise<KnowledgeDomain> {
    const domainId = `domain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Pinecone disabled - just return the domain object without storing
    return {
      id: domainId,
      ...domain,
      embeddingCount: 0,
      createdAt: new Date()
    };
  }

  // Add knowledge to a domain
  async addToDomain(domainId: string, entries: Omit<DomainEntry, 'id' | 'domainId'>[]): Promise<void> {
    // Pinecone disabled - no operation performed
    console.log(`Pinecone disabled: Would add ${entries.length} entries to domain ${domainId}`);
  }

  // Search within a specific domain
  async searchDomain(domainId: string, query: string): Promise<DomainEntry[]> {
    // Pinecone disabled - return empty array
    console.log(`Pinecone disabled: Would search domain ${domainId} for "${query}"`);
    return [];
  }

  // Search across all domains
  async searchAllDomains(query: string): Promise<DomainEntry[]> {
    // Pinecone disabled - return empty array
    console.log(`Pinecone disabled: Would search all domains for "${query}"`);
    return [];
  }

  // Get user's domains
  async getUserDomains(userId: string): Promise<KnowledgeDomain[]> {
    // Pinecone disabled - return empty array
    console.log(`Pinecone disabled: Would get domains for user ${userId}`);
    return [];
  }

  // Get public domains
  async getPublicDomains(): Promise<KnowledgeDomain[]> {
    // Pinecone disabled - return empty array
    console.log('Pinecone disabled: Would get public domains');
    return [];
  }

  // Delete a domain and all its entries
  async deleteDomain(domainId: string): Promise<void> {
    // Pinecone disabled - no operation performed
    console.log(`Pinecone disabled: Would delete domain ${domainId}`);
  }
}

// Export singleton instance
export const pineconeService = new PineconeService(); 