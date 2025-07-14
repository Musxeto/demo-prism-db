import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { QueryResult } from '../../../shared/schema';

export interface QueryTab {
  id: string;
  name: string;
  connectionId: number;
  query: string;
  lastExecutedQuery?: string;
  result?: QueryResult;
  isExecuting: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  hasUnsavedChanges: boolean;
  scrollPosition?: { top: number; left: number };
  cursorPosition?: { line: number; column: number };
}

interface QueryTabsStore {
  tabs: QueryTab[];
  activeTabId: string | null;
  
  // Actions
  addTab: (connectionId: number, initialQuery?: string, tableName?: string) => string;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string, onAutoSave?: (tabName: string) => void) => void;
  updateTabQuery: (tabId: string, query: string) => void;
  updateTabName: (tabId: string, name: string) => void;
  setTabExecuting: (tabId: string, isExecuting: boolean) => void;
  setTabResult: (tabId: string, result: QueryResult, executedQuery: string) => void;
  setTabError: (tabId: string, error: string) => void;
  clearTabError: (tabId: string) => void;
  setTabScrollPosition: (tabId: string, position: { top: number; left: number }) => void;
  setTabCursorPosition: (tabId: string, position: { line: number; column: number }) => void;
  changeTabConnection: (tabId: string, connectionId: number) => void;
  duplicateTab: (tabId: string) => string;
  closeAllTabs: () => void;
  saveAllTabs: () => void;
  saveTab: (tabId: string) => void;
  saveCurrentEditorContent: (tabId: string, content: string) => void;
  
  // Computed getters
  getActiveTab: () => QueryTab | null;
  getTabById: (tabId: string) => QueryTab | null;
  getTabsWithUnsavedChanges: () => QueryTab[];
  hasUnsavedChanges: () => boolean;
}

export const useQueryTabsStore = create<QueryTabsStore>()(
  devtools(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (connectionId: number, initialQuery?: string, tableName?: string) => {
        const state = get();
        // Always generate a unique ID using nanoid for each tab
        const newTabId = nanoid();
        
        // Generate a unique tab name
        let tabName: string;
        if (tableName) {
          tabName = tableName;
        } else {
          // Find the next available query number
          const existingNumbers = state.tabs
            .map(tab => {
              const match = tab.name.match(/^Query (\d+)$/);
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter(num => num > 0);
          
          const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
          tabName = `Query ${nextNumber}`;
        }
        
        const query = initialQuery || (tableName ? `SELECT * FROM ${tableName} LIMIT 100;` : '');
        
        // Ensure all required fields are initialized
        const newTab: QueryTab = {
          id: newTabId,
          name: tabName,
          connectionId,
          query,
          isExecuting: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          hasUnsavedChanges: false,
          lastExecutedQuery: query, // Initialize this to match the query so hasUnsavedChanges works correctly
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTabId,
        }));

        return newTabId;
      },

      removeTab: (tabId: string) => {
        set((state) => {
          const newTabs = state.tabs.filter(tab => tab.id !== tabId);
          let newActiveTabId = state.activeTabId;

          // If we're removing the active tab, switch to another tab
          if (state.activeTabId === tabId) {
            if (newTabs.length > 0) {
              const removedIndex = state.tabs.findIndex(tab => tab.id === tabId);
              // Try to activate the next tab, or the previous one if it was the last
              const nextIndex = removedIndex < newTabs.length ? removedIndex : newTabs.length - 1;
              newActiveTabId = newTabs[nextIndex]?.id || null;
            } else {
              newActiveTabId = null;
            }
          }

          return {
            tabs: newTabs,
            activeTabId: newActiveTabId,
          };
        });
      },

      setActiveTab: (tabId: string, onAutoSave?: (tabName: string) => void) => {
        set((state) => {
          // First check if the requested tab actually exists
          const targetTab = state.tabs.find(tab => tab.id === tabId);
          
          // Only set active tab if the tab actually exists, no auto-save during tab switching
          if (targetTab) {
            return { activeTabId: tabId };
          }
          // If tab doesn't exist, keep current activeTabId or set to first available tab
          const fallbackTabId = state.tabs.length > 0 ? state.tabs[0].id : null;
          return { activeTabId: fallbackTabId };
        });
      },

      updateTabQuery: (tabId: string, query: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? {
                  ...tab,
                  query,
                  updatedAt: new Date(),
                  hasUnsavedChanges: query !== (tab.lastExecutedQuery || ''),
                }
              : tab
          ),
        }));
      },

      updateTabName: (tabId: string, name: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, name, updatedAt: new Date() }
              : tab
          ),
        }));
      },

      setTabExecuting: (tabId: string, isExecuting: boolean) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, isExecuting, error: isExecuting ? undefined : tab.error }
              : tab
          ),
        }));
      },

      setTabResult: (tabId: string, result: QueryResult, executedQuery: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? {
                  ...tab,
                  result,
                  lastExecutedQuery: executedQuery,
                  hasUnsavedChanges: tab.query !== executedQuery,
                  isExecuting: false,
                  error: undefined,
                  updatedAt: new Date(),
                }
              : tab
          ),
        }));
      },

      setTabError: (tabId: string, error: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, error, isExecuting: false, updatedAt: new Date() }
              : tab
          ),
        }));
      },

      clearTabError: (tabId: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, error: undefined }
              : tab
          ),
        }));
      },

      setTabScrollPosition: (tabId: string, position: { top: number; left: number }) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, scrollPosition: position }
              : tab
          ),
        }));
      },

      setTabCursorPosition: (tabId: string, position: { line: number; column: number }) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, cursorPosition: position }
              : tab
          ),
        }));
      },

      changeTabConnection: (tabId: string, connectionId: number) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? {
                  ...tab,
                  connectionId,
                  result: undefined,
                  lastExecutedQuery: undefined,
                  error: undefined,
                  hasUnsavedChanges: false,
                  updatedAt: new Date(),
                }
              : tab
          ),
        }));
      },

      duplicateTab: (tabId: string) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab) return '';

        const newTabId = nanoid();
        
        // Generate a unique name for the duplicated tab
        let baseName = tab.name;
        if (baseName.endsWith(' (Copy)')) {
          baseName = baseName.replace(/ \(Copy\)$/, '');
        }
        
        // Find existing copies and generate next number
        const copyPattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(Copy(?: (\\d+))?\\)$`);
        const existingCopies = state.tabs
          .map(t => {
            const match = t.name.match(copyPattern);
            if (!match) return 0;
            return match[1] ? parseInt(match[1], 10) : 1;
          })
          .filter(num => num > 0);
        
        const nextCopyNumber = existingCopies.length > 0 ? Math.max(...existingCopies) + 1 : 1;
        const newName = nextCopyNumber === 1 ? `${baseName} (Copy)` : `${baseName} (Copy ${nextCopyNumber})`;
        
        const newTab: QueryTab = {
          ...tab,
          id: newTabId,
          name: newName,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTabId,
        }));

        return newTabId;
      },

      closeAllTabs: () => {
        set({ tabs: [], activeTabId: null });
      },

      saveAllTabs: () => {
        set((state) => ({
          tabs: state.tabs.map(tab => ({
            ...tab,
            lastExecutedQuery: tab.query,
            hasUnsavedChanges: false,
            updatedAt: new Date(),
          })),
        }));
      },

      saveTab: (tabId: string) => {
        set((state) => {
          const updated = {
            tabs: state.tabs.map(tab =>
              tab.id === tabId
                ? {
                    ...tab,
                    lastExecutedQuery: tab.query,
                    hasUnsavedChanges: false,
                    updatedAt: new Date(),
                  }
                : tab
            ),
          };
          return updated;
        });
      },

      saveCurrentEditorContent: (tabId: string, content: string) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? {
                  ...tab,
                  query: content,
                  updatedAt: new Date(),
                  hasUnsavedChanges: content !== (tab.lastExecutedQuery || ''),
                }
              : tab
          ),
        }));
      },

      // Computed getters
      getActiveTab: () => {
        const state = get();
        let activeTab = state.tabs.find(tab => tab.id === state.activeTabId);
        
        // If no active tab found but tabs exist, auto-select the first tab
        if (!activeTab && state.tabs.length > 0) {
          const firstTab = state.tabs[0];
          // Update the active tab ID to the first available tab
          set({ activeTabId: firstTab.id });
          return firstTab;
        }
        
        return activeTab || null;
      },

      getTabById: (tabId: string) => {
        return get().tabs.find(tab => tab.id === tabId) || null;
      },

      getTabsWithUnsavedChanges: () => {
        return get().tabs.filter(tab => tab.hasUnsavedChanges);
      },

      hasUnsavedChanges: () => {
        return get().tabs.some(tab => tab.hasUnsavedChanges);
      },
    }),
    {
      name: 'query-tabs-store',
    }
  )
);