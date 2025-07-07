import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Connection } from "@shared/schema";
import ConnectionSelector from "@/components/connection-selector";
import SchemaBrowser from "@/components/schema-browser";
import QueryEditor from "@/components/query-editor";
import ResultsPanel from "@/components/results-panel";
import ConnectionModal from "@/components/connection-modal";
import { Button } from "@/components/ui/button";
import { Database, Plus, User } from "lucide-react";

interface QueryTab {
  id: string;
  name: string;
  sql: string;
  connectionId: number;
  isActive: boolean;
}

export default function DatabaseStudio() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<number>(1);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [queryTabs, setQueryTabs] = useState<QueryTab[]>([
    {
      id: "1",
      name: "User Analytics Query",
      sql: `-- User Analytics Query
-- This query provides insights into user engagement and order patterns

SELECT 
    u.id,
    u.username,
    u.email,
    u.created_at,
    COUNT(o.id) as total_orders,
    SUM(o.total_amount) as total_spent,
    MAX(o.created_at) as last_order_date,
    CASE 
        WHEN COUNT(o.id) = 0 THEN 'No Orders'
        WHEN COUNT(o.id) BETWEEN 1 AND 5 THEN 'Light User'
        WHEN COUNT(o.id) BETWEEN 6 AND 20 THEN 'Regular User'
        ELSE 'Power User'
    END as user_segment
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    AND u.email IS NOT NULL
GROUP BY u.id, u.username, u.email, u.created_at
HAVING total_orders > 0
ORDER BY total_spent DESC, last_order_date DESC
LIMIT 500;`,
      connectionId: 1,
      isActive: true,
    },
    {
      id: "2",
      name: "Orders Report",
      sql: "SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;",
      connectionId: 1,
      isActive: false,
    },
    {
      id: "3",
      name: "Product Catalog",
      sql: "SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id;",
      connectionId: 1,
      isActive: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState("1");

  const { data: connections } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
  });

  const activeTab = queryTabs.find(tab => tab.id === activeTabId);

  const handleTabSwitch = (tabId: string) => {
    setActiveTabId(tabId);
    setQueryTabs(prev =>
      prev.map(tab => ({
        ...tab,
        isActive: tab.id === tabId,
      }))
    );
  };

  const handleTabClose = (tabId: string) => {
    if (queryTabs.length === 1) return; // Don't close the last tab
    
    const tabIndex = queryTabs.findIndex(tab => tab.id === tabId);
    const newTabs = queryTabs.filter(tab => tab.id !== tabId);
    
    if (activeTabId === tabId) {
      // Switch to adjacent tab
      const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : 0;
      setActiveTabId(newTabs[newActiveIndex]?.id || "");
    }
    
    setQueryTabs(newTabs);
  };

  const handleNewQuery = () => {
    const newTab: QueryTab = {
      id: Date.now().toString(),
      name: "New Query",
      sql: "-- Write your SQL query here...",
      connectionId: selectedConnectionId,
      isActive: true,
    };
    
    setQueryTabs(prev => [...prev.map(tab => ({ ...tab, isActive: false })), newTab]);
    setActiveTabId(newTab.id);
  };

  const updateTabSql = (tabId: string, sql: string) => {
    setQueryTabs(prev =>
      prev.map(tab =>
        tab.id === tabId ? { ...tab, sql } : tab
      )
    );
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Database Query Studio</h1>
            <p className="text-sm text-slate-500">Multi-database management platform</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={() => setIsConnectionModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Connection
          </Button>
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <ConnectionSelector
            connections={connections || []}
            selectedConnectionId={selectedConnectionId}
            onConnectionChange={setSelectedConnectionId}
          />
          <SchemaBrowser connectionId={selectedConnectionId} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Tab Bar */}
          <div className="bg-white border-b border-slate-200 px-6 py-2">
            <div className="flex items-center space-x-1">
              {queryTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium border-r border-slate-200 cursor-pointer ${
                    tab.id === activeTabId
                      ? "bg-slate-100 text-slate-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-600"
                  }`}
                  onClick={() => handleTabSwitch(tab.id)}
                >
                  <Database className="w-4 h-4 mr-2 text-slate-500" />
                  <span>{tab.name}</span>
                  <button
                    className="ml-2 text-slate-400 hover:text-slate-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTabClose(tab.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="flex items-center px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                onClick={handleNewQuery}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Query
              </button>
            </div>
          </div>

          {/* Query Editor */}
          {activeTab && (
            <QueryEditor
              tab={activeTab}
              onSqlChange={(sql) => updateTabSql(activeTab.id, sql)}
            />
          )}
        </main>
      </div>

      {/* Results Panel */}
      <ResultsPanel connectionId={selectedConnectionId} />

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        onConnectionCreated={() => setIsConnectionModalOpen(false)}
      />
    </div>
  );
}
