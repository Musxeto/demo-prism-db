import React, { useState, useEffect } from 'react';
import { Search, Plus, Star, Filter, FolderOpen, Play, Edit, Trash2, Heart } from 'lucide-react';
import { useSavedQueriesStore } from '../contexts/saved-queries-store';
import { savedQueriesAPI } from '../lib/saved-queries-api';
import type { SavedQuery } from '../../../shared/schema';
import { SavedQueryModal } from './saved-query-modal';

interface SavedQueriesPanelProps {
  connectionId?: number;
  onQuerySelect?: (query: SavedQuery) => void;
  onQueryRun?: (query: SavedQuery) => void;
  className?: string;
}

export const SavedQueriesPanel: React.FC<SavedQueriesPanelProps> = ({
  connectionId,
  onQuerySelect,
  onQueryRun,
  className = ''
}) => {
  const {
    queries,
    searchTerm,
    selectedCategory,
    showFavoritesOnly,
    loading,
    error,
    setQueries,
    setSearchTerm,
    setSelectedCategory,
    setShowFavoritesOnly,
    setLoading,
    setError,
    updateQuery,
    removeQuery,
    addQuery,
    filteredQueries,
    categories
  } = useSavedQueriesStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);

  useEffect(() => {
    loadQueries();
  }, [connectionId]);

  const loadQueries = async () => {
    if (!connectionId) {
      console.log('LoadQueries: No connectionId, clearing queries');
      setQueries([]);
      return;
    }
    
    try {
      console.log('LoadQueries: Loading queries for connectionId:', connectionId);
      setLoading(true);
      setError(null);
      // Only load queries for the current connection
      const response = await savedQueriesAPI.getQueries(0, 100, undefined, undefined, false, connectionId);
      console.log('LoadQueries: Received queries:', response.queries.length);
      setQueries(response.queries);
    } catch (err) {
      console.error('LoadQueries: Error loading queries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load saved queries');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuery = () => {
    setEditingQuery(null);
    setIsModalOpen(true);
  };

  const handleEditQuery = (query: SavedQuery) => {
    setEditingQuery(query);
    setIsModalOpen(true);
  };

  const handleDeleteQuery = async (id: number) => {
    if (!confirm('Are you sure you want to delete this saved query?')) {
      return;
    }

    try {
      await savedQueriesAPI.deleteQuery(id);
      // Reload queries to ensure UI is in sync
      await loadQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete query');
    }
  };

  const handleToggleFavorite = async (query: SavedQuery) => {
    try {
      const updatedQuery = await savedQueriesAPI.toggleFavorite(query.id);
      updateQuery(query.id, updatedQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle favorite');
    }
  };

  const handleModalSave = async (queryData: any) => {
    try {
      // Add connection_id to the query data
      const queryWithConnection = {
        ...queryData,
        connection_id: connectionId
      };
      
      console.log('HandleModalSave: Saving query for connectionId:', connectionId);
      
      if (editingQuery) {
        console.log('HandleModalSave: Updating existing query:', editingQuery.id);
        const updatedQuery = await savedQueriesAPI.updateQuery(editingQuery.id, queryWithConnection);
        updateQuery(editingQuery.id, updatedQuery);
      } else {
        console.log('HandleModalSave: Creating new query');
        await savedQueriesAPI.createQuery(queryWithConnection);
        console.log('HandleModalSave: Query created, reloading queries');
        // Reload all queries to get the fresh state from server
        await loadQueries();
      }
      setIsModalOpen(false);
      setEditingQuery(null);
    } catch (err) {
      console.error('HandleModalSave: Error saving query:', err);
      setError(err instanceof Error ? err.message : 'Failed to save query');
    }
  };

  const formatTags = (tagsJson: string | null): string[] => {
    if (!tagsJson) return [];
    try {
      return JSON.parse(tagsJson);
    } catch {
      return [];
    }
  };

  const filteredQueriesList = filteredQueries();

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Saved Queries</h2>
          <button
            onClick={handleCreateQuery}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Create new query"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search queries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
              showFavoritesOnly
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Star size={14} className={showFavoritesOnly ? 'fill-current' : ''} />
            Favorites
          </button>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories().map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-600 bg-red-50 border-l-4 border-red-400">
            {error}
          </div>
        ) : filteredQueriesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <FolderOpen size={32} className="mb-2" />
            <p>No saved queries found</p>
            <button
              onClick={handleCreateQuery}
              className="mt-2 text-blue-600 hover:underline"
            >
              Create your first query
            </button>
          </div>
        ) : (
          <div className="p-2">
            {filteredQueriesList.map((query) => (
              <div
                key={query.id}
                className="mb-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">{query.name}</h3>
                      {query.is_favorite && (
                        <Star size={14} className="text-yellow-500 fill-current" />
                      )}
                    </div>
                    
                    {query.description && (
                      <p className="text-sm text-gray-600 mb-2 truncate">{query.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {query.category && (
                        <span className="px-2 py-1 bg-gray-100 rounded-full">{query.category}</span>
                      )}
                      <span>Updated {new Date(query.updated_at).toLocaleDateString()}</span>
                    </div>

                    {formatTags(query.tags).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formatTags(query.tags).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 ml-2">                      <button
                        onClick={() => handleToggleFavorite(query)}
                        className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                        title={query.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart size={16} className={query.is_favorite ? 'fill-current text-yellow-500' : ''} />
                      </button>
                    
                    {onQueryRun && (
                      <button
                        onClick={() => onQueryRun(query)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Run query"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleEditQuery(query)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit query"
                    >
                      <Edit size={16} />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteQuery(query.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete query"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {onQuerySelect && (
                  <button
                    onClick={() => onQuerySelect(query)}
                    className="mt-2 w-full px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                  >
                    Load Query
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <SavedQueryModal
          query={editingQuery}
          onSave={handleModalSave}
          onClose={() => {
            setIsModalOpen(false);
            setEditingQuery(null);
          }}
        />
      )}
    </div>
  );
};
