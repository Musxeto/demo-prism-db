import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Connection } from '../../../shared/schema';
import { useQueryTabsStore } from '../contexts/query-tabs-store';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import ConnectionSelector from './connection-selector';
import { SchemaBrowserWithTabs } from './schema-browser-tabs';
import { MultiTabQueryStudio } from './multi-tab-query-studio';
import ConnectionModal from './connection-modal';
import ConnectionSettingsModal from './connection-settings-modal';
import ConnectionDeleteModal from './connection-delete-modal';
import ERDViewer from './erd-viewer';
import { 
  Database, 
  Plus, 
  Settings, 
  GitBranch, 
  Maximize2, 
  Minimize2,
  AlertCircle,
  RefreshCw,
  History, // Import History icon
  BookOpen // Import BookOpen icon for saved queries
} from 'lucide-react';
import { QueryHistoryModal } from './query-history-modal'; // Import the modal
import { SavedQueriesPanel } from './saved-queries-panel'; // Import saved queries panel

type ViewMode = 'query' | 'erd';

export function EnhancedDatabaseStudio() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false); // State for history modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [connectionToEdit, setConnectionToEdit] = useState<Connection | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<Connection | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('query');
  const [isSchemaCollapsed, setIsSchemaCollapsed] = useState(false);
  const [isSavedQueriesCollapsed, setIsSavedQueriesCollapsed] = useState(false);
  
  const { tabs, activeTabId, hasUnsavedChanges, closeAllTabs, addTab } = useQueryTabsStore();

  const { data: connections, isLoading: connectionsLoading, refetch } = useQuery<Connection[]>({
    queryKey: ['/api/connections'],
    queryFn: async () => {
      const response = await fetch('/api/connections');
      if (!response.ok) throw new Error('Failed to fetch connections');
      return response.json();
    },
  });

  const selectedConnection = connections?.find(conn => conn.id === selectedConnectionId);

  const handleConnectionChange = (connectionId: number) => {
    // Check for unsaved changes before switching
    if (hasUnsavedChanges()) {
      const confirmSwitch = window.confirm(
        'You have unsaved changes in your query tabs. Switching connections will close all tabs. Do you want to continue?'
      );
      if (!confirmSwitch) return;
      closeAllTabs();
    }
    setSelectedConnectionId(connectionId);
  };

  const handleQuerySelectFromHistory = (query: string) => {
    if (selectedConnectionId) {
      addTab(selectedConnectionId, query);
    }
    setIsHistoryModalOpen(false);
  };

  const handleSavedQuerySelect = (query: any) => {
    if (selectedConnectionId) {
      addTab(selectedConnectionId, query.sql, query.name);
    }
  };

  const handleSavedQueryRun = (query: any) => {
    if (selectedConnectionId) {
      const newTabId = addTab(selectedConnectionId, query.name, query.sql);
    }
  };

  const toggleSchemaPanel = () => {
    setIsSchemaCollapsed(!isSchemaCollapsed);
  };

  const toggleSavedQueriesPanel = () => {
    setIsSavedQueriesCollapsed(!isSavedQueriesCollapsed);
  };

  const handleSettingsClick = (connection: Connection) => {
    setConnectionToEdit(connection);
    setIsSettingsModalOpen(true);
  };

  const handleDeleteClick = (connection: Connection) => {
    setConnectionToDelete(connection);
    setIsDeleteModalOpen(true);
  };

  const handleConnectionUpdated = () => {
    refetch();
  };

  const handleConnectionDeleted = () => {
    refetch();
    // If the deleted connection was the active one, reset the selection
    if (connectionToDelete && connectionToDelete.id === selectedConnectionId) {
      setSelectedConnectionId(null);
      closeAllTabs();
    }
  };

  if (connectionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading connections...</p>
        </div>
      </div>
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-4 max-w-md">
          <Database className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">No Database Connections</h2>
            <p className="text-muted-foreground mt-2">
              Create your first database connection to start exploring your data and writing queries.
            </p>
          </div>
          <Button onClick={() => setIsConnectionModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Database Studio</h1>
          </div>
          
          {selectedConnection && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                {selectedConnection.name}
              </Badge>
              {tabs.length > 0 && (
                <Badge variant="secondary">
                  {tabs.length} tabs
                </Badge>
              )}
              {hasUnsavedChanges() && (
                <Badge variant="destructive">
                  Unsaved changes
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'query' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('query')}
              className="h-7 px-2"
            >
              <Database className="h-4 w-4 mr-1" />
              Query
            </Button>
            <Button
              variant={viewMode === 'erd' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('erd')}
              className="h-7 px-2"
              disabled={!selectedConnectionId}
            >
              <GitBranch className="h-4 w-4 mr-1" />
              ERD
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSchemaPanel}
            className="gap-2"
          >
            {isSchemaCollapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            {isSchemaCollapsed ? 'Show' : 'Hide'} Schema
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSavedQueriesPanel}
            className="gap-2"
          >
            {isSavedQueriesCollapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            <BookOpen className="h-4 w-4" />
            {isSavedQueriesCollapsed ? 'Show' : 'Hide'} Saved Queries
          </Button>

          <Button onClick={() => setIsConnectionModalOpen(true)} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Connection
          </Button>

          <Button onClick={() => refetch()} size="sm" variant="ghost">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Connection Selector */}
      <div className="border-b bg-muted/30">
        <ConnectionSelector
          connections={connections}
          selectedConnectionId={selectedConnectionId}
          onConnectionChange={handleConnectionChange}
          activeTabId={activeTabId}
          onSettingsClick={handleSettingsClick}
          onDeleteClick={handleDeleteClick}
        />
      </div>

      {/* Main Content */}
      {!selectedConnectionId ? (
        <div className="flex-1 flex items-center justify-center">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a database connection from the dropdown above to start exploring your data.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup direction="horizontal">
            {/* Schema Browser Panel */}
            {!isSchemaCollapsed && (
              <>
                <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                  <SchemaBrowserWithTabs 
                    connectionId={selectedConnectionId} 
                    onViewHistoryClick={() => setIsHistoryModalOpen(true)}
                  />
                </ResizablePanel>
                <ResizableHandle />
              </>
            )}

            {/* Main Content Panel */}
            <ResizablePanel 
              defaultSize={
                isSchemaCollapsed && isSavedQueriesCollapsed ? 100 :
                isSchemaCollapsed || isSavedQueriesCollapsed ? 75 : 50
              }
            >
              {viewMode === 'query' ? (
                <MultiTabQueryStudio connectionId={selectedConnectionId} />
              ) : (
                selectedConnectionId && <ERDViewer connectionId={selectedConnectionId} />
              )}
            </ResizablePanel>

            {/* Saved Queries Panel */}
            {!isSavedQueriesCollapsed && (
              <>
                <ResizableHandle />
                <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                  <SavedQueriesPanel 
                    connectionId={selectedConnectionId}
                    onQuerySelect={handleSavedQuerySelect}
                    onQueryRun={handleSavedQueryRun}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      )}

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        onConnectionCreated={() => {
          setIsConnectionModalOpen(false);
          refetch();
        }}
      />

      {/* Connection Settings Modal */}
      <ConnectionSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          setConnectionToEdit(null);
        }}
        connection={connectionToEdit}
        onConnectionUpdated={handleConnectionUpdated}
      />

      {/* Connection Delete Modal */}
      <ConnectionDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setConnectionToDelete(null);
        }}
        connection={connectionToDelete}
        onConnectionDeleted={handleConnectionDeleted}
      />

      {/* History Modal */}
      <QueryHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onQuerySelect={handleQuerySelectFromHistory}
      />
    </div>
  );
}

export default EnhancedDatabaseStudio;
