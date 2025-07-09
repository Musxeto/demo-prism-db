import React, { useEffect, useState } from 'react';
import { useQueryTabsStore } from '../contexts/query-tabs-store';
import { QueryTabs } from './query-tabs';
import QueryEditor from './query-editor';
import { ResultsPanelTab } from './results-panel-tab-enhanced';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { Button } from './ui/button';
import { AlertCircle, Database, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { cn } from '../lib/utils';

interface CustomPopupProps {
  title?: string;
  description: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'info' | 'warning' | 'error';
  onClose?: () => void;
}

function CustomPopup({
  title,
  description,
  icon = <AlertCircle className="h-5 w-5" />,
  actions,
  variant = 'info',
  onClose,
}: CustomPopupProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  // Auto-hide after 8 seconds if no actions are provided
  useEffect(() => {
    if (!actions && onClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [actions, onClose]);

  const variantClasses = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    error: "bg-red-50 border-red-200 text-red-800",
  };

  const iconClasses = {
    info: "text-blue-500",
    warning: "text-amber-500",
    error: "text-red-500",
  };

  const defaultIcons = {
    info: <AlertCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "rounded-lg border p-4 shadow-sm max-w-md w-full transition-all duration-300", 
        variantClasses[variant],
        "animate-in fade-in-50 slide-in-from-bottom-5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5", iconClasses[variant])}>
          {icon || defaultIcons[variant]}
        </div>
        <div className="flex-1 space-y-2">
          {title && <h4 className="font-medium text-base">{title}</h4>}
          <p className="text-sm">{description}</p>
          {actions && <div className="flex gap-2 mt-3">{actions}</div>}
        </div>
        {onClose && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClose} 
            className="h-6 w-6 p-0 rounded-full hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface MultiTabQueryStudioProps {
  connectionId?: number;
  onOpenFromSchema?: (tableName: string) => void;
}

export function MultiTabQueryStudio({ connectionId, onOpenFromSchema }: MultiTabQueryStudioProps) {
  const { tabs, activeTabId, getActiveTab, addTab, setActiveTab, saveAllTabs, getTabsWithUnsavedChanges } = useQueryTabsStore();
  const activeTab = getActiveTab();
  const { toast } = useToast();
  const [popup, setPopup] = useState<{ title?: string; description: string; variant?: 'info' | 'warning' | 'error' } | null>(null);

  // Initialize with a default tab if none exist and we have a connection
  useEffect(() => {
    if (connectionId && tabs.length === 0) {
      addTab(connectionId);
    }
  }, [connectionId, tabs.length, addTab]);

  // Failsafe: if we have tabs but no active tab, activate the first one
  useEffect(() => {
    if (tabs.length > 0 && !activeTab && !activeTabId) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab, activeTabId, setActiveTab]);

  // Auto-save all tabs periodically (every 30 seconds) to prevent data loss
  useEffect(() => {
    const interval = setInterval(() => {
      const unsavedTabs = getTabsWithUnsavedChanges();
      if (unsavedTabs.length > 0) {
        saveAllTabs();
        toast({
          title: "Auto-saved",
          description: `${unsavedTabs.length} tab(s) automatically saved`,
          duration: 2000,
        });
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [saveAllTabs, getTabsWithUnsavedChanges, toast]);

  // Save all tabs when component unmounts or connection changes
  useEffect(() => {
    return () => {
      const unsavedTabs = getTabsWithUnsavedChanges();
      if (unsavedTabs.length > 0) {
        saveAllTabs();
      }
    };
  }, [saveAllTabs, getTabsWithUnsavedChanges]);

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
        <CustomPopup 
          title="No Database Connection"
          description="Please select a database connection to start writing queries."
          variant="warning"
        />
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <CustomPopup
          icon={<Database className="h-6 w-6" />}
          title="No Query Tabs Open"
          description="Create a new tab to start writing SQL queries"
          actions={connectionId && (
            <Button 
              onClick={() => addTab(connectionId)}
              size="sm"
              variant="default"
            >
              Create New Tab
            </Button>
          )}
          variant="info"
        />
      </div>
    );
  }

  if (!activeTab) {
    // If we have tabs but no active tab, try to auto-fix by creating a new tab
    if (tabs.length > 0) {
      return (
        <div className="flex flex-col h-full">
          <QueryTabs defaultConnectionId={connectionId} />
          <div className="flex-1 flex items-center justify-center">
            <CustomPopup 
              title="No Active Tab"
              description="No active tab selected. Auto-fixing..."
              actions={
                <Button 
                  onClick={() => setActiveTab(tabs[0].id)}
                  size="sm"
                  variant="outline"
                >
                  Activate First Tab
                </Button>
              }
              variant="info"
            />
          </div>
        </div>
      );
    }
    
    // No tabs exist, create one if we have a connection
    if (connectionId) {
      return (
        <div className="flex flex-col h-full">
          <QueryTabs defaultConnectionId={connectionId} />
          <div className="flex-1 flex items-center justify-center">
            <CustomPopup 
              title="No Query Tabs"
              description="No query tabs open. Creating a new tab..."
              actions={
                <Button 
                  onClick={() => addTab(connectionId)}
                  size="sm"
                  variant="outline"
                >
                  Create New Tab
                </Button>
              }
              variant="info"
            />
          </div>
        </div>
      );
    }
    
    // No connection available
    return (
      <div className="flex flex-col h-full">
        <QueryTabs defaultConnectionId={connectionId} />
        <div className="flex-1 flex items-center justify-center">
          <CustomPopup 
            title="No Active Tab"
            description="No active tab selected. Please select a tab or create a new one."
            variant="warning"
          />
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
