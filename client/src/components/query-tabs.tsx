import React, { useEffect, useRef } from 'react';
import { useQueryTabsStore } from '../contexts/query-tabs-store';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger 
} from './ui/alert-dialog';
import { EditableTabName } from './editable-tab-name';
import { Plus, X, Circle } from 'lucide-react';
import { cn } from '../lib/utils';

interface QueryTabsProps {
  defaultConnectionId?: number;
}

export function QueryTabs({ defaultConnectionId }: QueryTabsProps) {
  const {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    setActiveTab,
    updateTabName,
    getTabsWithUnsavedChanges,
  } = useQueryTabsStore();

  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active tab when it changes
  useEffect(() => {
    if (activeTabId && tabsContainerRef.current) {
      const activeTabElement = tabsContainerRef.current.querySelector(
        `[data-tab-id="${activeTabId}"]`
      );
      if (activeTabElement) {
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    }
  }, [activeTabId]);

  const handleAddTab = () => {
    if (defaultConnectionId) {
      addTab(defaultConnectionId);
    }
  };

  const handleCloseTab = (tabId: string, hasUnsavedChanges: boolean) => {
    if (hasUnsavedChanges) {
      // The confirmation dialog will be handled by the AlertDialog component
      return;
    }
    removeTab(tabId);
  };

  const handleForceCloseTab = (tabId: string) => {
    removeTab(tabId);
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const unsavedTabs = getTabsWithUnsavedChanges();

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 border-b bg-muted/30">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">No query tabs open</p>
          {defaultConnectionId && (
            <Button onClick={handleAddTab} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Query
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b bg-background">
      <div className="flex items-center">
        <ScrollArea className="flex-1">
          <div 
            ref={tabsContainerRef}
            className="flex items-center min-w-fit px-2 py-1 gap-1"
          >
            {tabs.map((tab) => (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-md border transition-colors min-w-0 max-w-48",
                  "hover:bg-muted/50 cursor-pointer select-none",
                  activeTabId === tab.id
                    ? "bg-background border-border shadow-sm"
                    : "bg-muted/30 border-transparent"
                )}
                onClick={() => handleTabClick(tab.id)}
              >
                {/* Unsaved changes indicator */}
                {tab.hasUnsavedChanges && (
                  <Circle className="h-2 w-2 fill-orange-500 text-orange-500 flex-shrink-0" />
                )}

                {/* Executing indicator */}
                {tab.isExecuting && (
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
                )}

                {/* Tab name */}
                <div className="flex-1 min-w-0">
                  <EditableTabName
                    value={tab.name}
                    onChange={(name) => updateTabName(tab.id, name)}
                    className="text-sm font-medium truncate"
                  />
                </div>

                {/* Error indicator */}
                {tab.error && (
                  <Badge variant="destructive" className="h-4 w-4 p-0 rounded-full">
                    <span className="sr-only">Error</span>
                  </Badge>
                )}

                {/* Close button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!tab.hasUnsavedChanges) {
                          handleCloseTab(tab.id, false);
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  {tab.hasUnsavedChanges && (
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                        <AlertDialogDescription>
                          The tab "{tab.name}" has unsaved changes. Are you sure you want to close it?
                          All unsaved changes will be lost.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleForceCloseTab(tab.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Close Anyway
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  )}
                </AlertDialog>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Add new tab button */}
        {defaultConnectionId && (
          <div className="px-2">
            <Button 
              onClick={handleAddTab} 
              size="sm" 
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Unsaved changes indicator */}
        {unsavedTabs.length > 0 && (
          <div className="px-2">
            <Badge variant="outline" className="text-xs">
              {unsavedTabs.length} unsaved
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}