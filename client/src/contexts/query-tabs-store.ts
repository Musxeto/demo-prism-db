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
  setActiveTab: (tabId: string) => void;
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
        const newTabId = nanoid();
        const tabName = tableName ? `${tableName}` : `Query ${get().tabs.length + 1}`;
        const query = initialQuery || (tableName ? `SELECT * FROM ${tableName} LIMIT 100;` : '');
        
        const newTab: QueryTab = {
          id: newTabId,
          name: tabName,
          connectionId,
          query,
          isExecuting: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          hasUnsavedChanges: false,
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

      setActiveTab: (tabId: string) => {
        set({ activeTabId: tabId });
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
        const tab = get().getTabById(tabId);
        if (!tab) return '';

        const newTabId = nanoid();
        const newTab: QueryTab = {
          ...tab,
          id: newTabId,
          name: `${tab.name} (Copy)`,
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

      // Computed getters
      getActiveTab: () => {
        const state = get();
        return state.tabs.find(tab => tab.id === state.activeTabId) || null;
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