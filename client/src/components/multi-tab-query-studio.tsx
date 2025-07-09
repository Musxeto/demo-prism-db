import React, { useEffect } from 'react';
import { useQueryTabsStore } from '../contexts/query-tabs-store';
import { QueryTabs } from './query-tabs';
import QueryEditor from './query-editor';
import { ResultsPanelTab } from './results-panel-tab-enhanced';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Database } from 'lucide-react';

interface MultiTabQueryStudioProps {
  connectionId?: number;
  onOpenFromSchema?: (tableName: string) => void;
}

export function MultiTabQueryStudio({ connectionId, onOpenFromSchema }: MultiTabQueryStudioProps) {
  const { tabs, activeTabId, getActiveTab, addTab } = useQueryTabsStore();
  const activeTab = getActiveTab();

  // Initialize with a default tab if none exist and we have a connection
  useEffect(() => {
    if (connectionId && tabs.length === 0) {
      addTab(connectionId);
    }
  }, [connectionId, tabs.length, addTab]);

  // Handle opening a new tab from schema browser
  useEffect(() => {
    if (onOpenFromSchema) {
      // Make the function available globally or through context
      // This is a simple implementation - you might want to use a more sophisticated approach
      (window as any).openQueryTabFromSchema = (tableName: string) => {
        if (connectionId) {
          addTab(connectionId, undefined, tableName);
        }
      };
    }
    
    return () => {
      if ((window as any).openQueryTabFromSchema) {
        delete (window as any).openQueryTabFromSchema;
      }
    };
  }, [onOpenFromSchema, connectionId, addTab]);

  if (!connectionId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a database connection to start writing queries.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Database className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-medium">No query tabs open</h3>
            <p className="text-sm text-muted-foreground">
              Create a new tab to start writing SQL queries
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!activeTab) {
    return (
      <div className="flex flex-col h-full">
        <QueryTabs defaultConnectionId={connectionId} />
        <div className="flex-1 flex items-center justify-center">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No active tab selected. Please select a tab or create a new one.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <QueryTabs defaultConnectionId={connectionId} />
      
      {/* Main Content Area with Resizable Panels */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="vertical" className="h-full">
          {/* Query Editor Panel */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <QueryEditor tab={activeTab} />
          </ResizablePanel>
          
          <ResizableHandle />
          
          {/* Results Panel */}
          <ResizablePanel defaultSize={50} minSize={20}>
            <ResultsPanelTab tab={activeTab} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export default MultiTabQueryStudio;
