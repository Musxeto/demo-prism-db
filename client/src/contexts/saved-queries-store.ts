import { create } from 'zustand';
import type { SavedQuery } from '../../../shared/schema';

interface SavedQueryState {
  queries: SavedQuery[];
  searchTerm: string;
  selectedCategory: string;
  showFavoritesOnly: boolean;
  loading: boolean;
  error: string | null;
  
  // Actions
  setQueries: (queries: SavedQuery[]) => void;
  addQuery: (query: SavedQuery) => void;
  updateQuery: (id: number, query: Partial<SavedQuery>) => void;
  removeQuery: (id: number) => void;
  toggleFavorite: (id: number) => void;
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string) => void;
  setShowFavoritesOnly: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed values
  filteredQueries: () => SavedQuery[];
  categories: () => string[];
}

export const useSavedQueriesStore = create<SavedQueryState>((set, get) => ({
  queries: [],
  searchTerm: '',
  selectedCategory: '',
  showFavoritesOnly: false,
  loading: false,
  error: null,
  
  setQueries: (queries) => set({ queries }),
  
  addQuery: (query) => set((state) => ({
    queries: [...state.queries, query]
  })),
  
  updateQuery: (id, updatedQuery) => set((state) => ({
    queries: state.queries.map(query => 
      query.id === id ? { ...query, ...updatedQuery } : query
    )
  })),
  
  removeQuery: (id) => set((state) => ({
    queries: state.queries.filter(query => query.id !== id)
  })),
  
  toggleFavorite: (id) => set((state) => ({
    queries: state.queries.map(query => 
      query.id === id ? { ...query, is_favorite: !query.is_favorite } : query
    )
  })),
  
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setShowFavoritesOnly: (showFavoritesOnly) => set({ showFavoritesOnly }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  filteredQueries: () => {
    const state = get();
    let filtered = state.queries;
    
    // Filter by search term
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      filtered = filtered.filter(query => 
        query.name.toLowerCase().includes(term) ||
        query.description?.toLowerCase().includes(term) ||
        query.sql.toLowerCase().includes(term)
      );
    }
    
    // Filter by category
    if (state.selectedCategory) {
      filtered = filtered.filter(query => query.category === state.selectedCategory);
    }
    
    // Filter by favorites
    if (state.showFavoritesOnly) {
      filtered = filtered.filter(query => query.is_favorite);
    }
    
    return filtered;
  },
  
  categories: () => {
    const state = get();
    const categories = new Set<string>();
    state.queries.forEach(query => {
      if (query.category) {
        categories.add(query.category);
      }
    });
    return Array.from(categories).sort();
  }
}));
