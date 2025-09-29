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

export class DomainService {
  // Get user's domains
  static async getUserDomains(token?: string): Promise<KnowledgeDomain[]> {
    try {
      const response = await fetch('/api/domains', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch domains');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user domains:', error);
      return [];
    }
  }

  // Get public domains
  static async getPublicDomains(token?: string): Promise<KnowledgeDomain[]> {
    try {
      const response = await fetch('/api/domains?type=public', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch public domains');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching public domains:', error);
      return [];
    }
  }

  // Create a new domain
  static async createDomain(
    domain: Omit<KnowledgeDomain, 'id' | 'embeddingCount' | 'createdAt' | 'ownerId'>,
    token?: string
  ): Promise<KnowledgeDomain | null> {
    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(domain),
      });

      if (!response.ok) {
        throw new Error('Failed to create domain');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating domain:', error);
      return null;
    }
  }

  // Delete a domain
  static async deleteDomain(domainId: string, token?: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/domains?domainId=${domainId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete domain');
      }

      return true;
    } catch (error) {
      console.error('Error deleting domain:', error);
      return false;
    }
  }

  // Search within a specific domain
  static async searchDomain(
    domainId: string,
    query: string,
    embedding: number[],
    topK: number = 10,
    token?: string
  ): Promise<DomainEntry[]> {
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          domainId,
          query,
          embedding,
          topK,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to search domain');
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching domain:', error);
      return [];
    }
  }

  // Search across all domains
  static async searchAllDomains(
    query: string,
    embedding: number[],
    topK: number = 20,
    token?: string
  ): Promise<DomainEntry[]> {
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query,
          embedding,
          topK,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to search domains');
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching all domains:', error);
      return [];
    }
  }

  // Add knowledge to a domain
  static async addToDomain(
    domainId: string,
    entries: Omit<DomainEntry, 'id' | 'domainId'>[],
    token?: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/domains/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          domainId,
          entries,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add entries to domain');
      }

      return true;
    } catch (error) {
      console.error('Error adding entries to domain:', error);
      return false;
    }
  }
} 