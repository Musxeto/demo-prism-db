import { useEffect } from 'react';
import { useQueryTabsStore } from '../contexts/query-tabs-store';
import { useToast } from './use-toast';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export function useQueryEditorShortcuts(connectionId: number | null) {
  const { addTab, removeTab, setActiveTab, tabs, activeTabId, getActiveTab, saveAllTabs, saveTab } = useQueryTabsStore();
  const { toast } = useToast();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 't',
      ctrlKey: true,
      action: () => {
        if (connectionId) {
          addTab(connectionId);
        }
      },
      description: 'Create new query tab',
    },
    {
      key: 'w',
      ctrlKey: true,
      action: () => {
        if (activeTabId) {
          removeTab(activeTabId);
        }
      },
      description: 'Close current tab',
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => {
        if (activeTabId) {
          saveTab(activeTabId);
        }
      },
      description: 'Save current tab',
    },
    {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      action: () => {
        saveAllTabs();
      },
      description: 'Save all tabs',
    },
    {
      key: 'Tab',
      ctrlKey: true,
      action: () => {
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
          const nextIndex = (currentIndex + 1) % tabs.length;
          setActiveTab(tabs[nextIndex].id, (tabName: string) => {
            toast({
              title: "Tab auto-saved",
              description: `"${tabName}" was automatically saved`,
              duration: 2000,
            });
          });
        }
      },
      description: 'Switch to next tab',
    },
    {
      key: 'Tab',
      ctrlKey: true,
      shiftKey: true,
      action: () => {
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          setActiveTab(tabs[prevIndex].id, (tabName: string) => {
            toast({
              title: "Tab auto-saved",
              description: `"${tabName}" was automatically saved`,
              duration: 2000,
            });
          });
        }
      },
      description: 'Switch to previous tab',
    },
    // Number shortcuts for direct tab access
    ...Array.from({ length: 9 }, (_, i) => ({
      key: (i + 1).toString(),
      ctrlKey: true,
      action: () => {
        if (tabs[i]) {
          setActiveTab(tabs[i].id, (tabName: string) => {
            toast({
              title: "Tab auto-saved",
              description: `"${tabName}" was automatically saved`,
              duration: 2000,
            });
          });
        }
      },
      description: `Switch to tab ${i + 1}`,
    })),
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs or textareas
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.altKey ? event.altKey : !event.altKey;
        const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;

        if (
          event.key === shortcut.key &&
          ctrlMatch &&
          shiftMatch &&
          altMatch &&
          metaMatch
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return { shortcuts };
}

export function KeyboardShortcutsHelp() {
  const shortcuts = [
    { key: 'Ctrl/Cmd + T', description: 'Create new query tab' },
    { key: 'Ctrl/Cmd + W', description: 'Close current tab' },
    { key: 'Ctrl/Cmd + Tab', description: 'Switch to next tab' },
    { key: 'Ctrl/Cmd + Shift + Tab', description: 'Switch to previous tab' },
    { key: 'Ctrl/Cmd + 1-9', description: 'Switch to specific tab' },
    { key: 'Ctrl/Cmd + Enter', description: 'Execute query' },
    { key: 'Ctrl/Cmd + S', description: 'Save current tab' },
    { key: 'Ctrl/Cmd + Shift + S', description: 'Save all tabs' },
    { key: 'Ctrl/Cmd + F', description: 'Find in editor' },
    { key: 'Ctrl/Cmd + H', description: 'Find and replace' },
  ];

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm">Keyboard Shortcuts</h3>
      <div className="space-y-1">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{shortcut.description}</span>
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
              {shortcut.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

export default useQueryEditorShortcuts;
