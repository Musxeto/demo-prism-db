import type { SavedQuery } from '../../../shared/schema';

export interface SavedQueryCreate {
  name: string;
  description?: string;
  sql: string;
  connection_id?: number;
  category?: string;
  tags?: string[];
}

export interface SavedQueryUpdate {
  name?: string;
  description?: string;
  sql?: string;
  connection_id?: number;
  category?: string;
  tags?: string[];
}

export interface SavedQueryListResponse {
  queries: SavedQuery[];
  total: number;
}

class SavedQueriesAPI {
  private baseUrl = '/api/saved-queries';

  async getQueries(
    skip = 0,
    limit = 100,
    search?: string,
    category?: string,
    favorites_only = false,
    connectionId?: number
  ): Promise<SavedQueryListResponse> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      favorites_only: favorites_only.toString(),
    });
    
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (connectionId) params.append('connection_id', connectionId.toString());
    
    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch saved queries: ${response.statusText}`);
    }
    return response.json();
  }

  async getQuery(id: number): Promise<SavedQuery> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch saved query: ${response.statusText}`);
    }
    return response.json();
  }

  async createQuery(query: SavedQueryCreate): Promise<SavedQuery> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...query,
        tags: query.tags ? JSON.stringify(query.tags) : null,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create saved query: ${response.statusText}`);
    }
    return response.json();
  }

  async updateQuery(id: number, query: SavedQueryUpdate): Promise<SavedQuery> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...query,
        tags: query.tags ? JSON.stringify(query.tags) : undefined,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update saved query: ${response.statusText}`);
    }
    return response.json();
  }

  async deleteQuery(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete saved query: ${response.statusText}`);
    }
  }

  async toggleFavorite(id: number): Promise<SavedQuery> {
    const response = await fetch(`${this.baseUrl}/${id}/toggle-favorite`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to toggle favorite: ${response.statusText}`);
    }
    return response.json();
  }
}

export const savedQueriesAPI = new SavedQueriesAPI();
