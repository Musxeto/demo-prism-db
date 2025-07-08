import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Connection } from "@shared/schema";
import ConnectionSelector from "@/components/connection-selector";
import SchemaBrowser from "@/components/schema-browser";
import QueryEditor from "@/components/query-editor";
import ResultsPanel from "@/components/results-panel";
import ConnectionModal from "@/components/connection-modal";
import ERDViewer from "./erd-viewer";
import { Button } from "@/components/ui/button";
import { Database, Plus, User, Maximize2, Minimize2, GitBranch, Terminal } from "lucide-react";

interface QueryTab {
  id: string;
  name: string;
  sql: string;
  connectionId: number;
  isActive: boolean;
}

interface PaginationState {
  sql: string;
  page: number;
  pageSize: number;
}

export default function ResizableDatabaseStudio() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<number>(1);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isSchemaExpanded, setIsSchemaExpanded] = useState(false);
  const [isResultsExpanded, setIsResultsExpanded] = useState(false);
  const [paginationState, setPaginationState] = useState<PaginationState | null>(null);
  const [viewMode, setViewMode] = useState<'query' | 'erd'>('query');
  const queryClient = useQueryClient();
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

  const handleTableClick = (tableName: string) => {
    const newTab: QueryTab = {
      id: `${tableName}-${Date.now()}`,
      name: `${tableName}.sql`,
      sql: `SELECT * FROM \`${tableName}\` LIMIT 100;`,
      connectionId: selectedConnectionId,
      isActive: true,
    };
    
    setQueryTabs(prev => [...prev.map(tab => ({ ...tab, isActive: false })), newTab]);
    setActiveTabId(newTab.id);
    
    // Set pagination state for this query
    setPaginationState({
      sql: newTab.sql,
      page: 1,
      pageSize: 100,
    });
  };

  const updateTabSql = (tabId: string, sql: string) => {
    setQueryTabs(prev =>
      prev.map(tab =>
        tab.id === tabId ? { ...tab, sql } : tab
      )
    );
  };

  const handleQueryExecuted = (sql: string, page: number = 1, pageSize: number = 100) => {
    setPaginationState({ sql, page, pageSize });
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
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'query' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('query')}
              className="h-8"
            >
              <Terminal className="w-4 h-4 mr-2" />
              Query
            </Button>
            <Button
              variant={viewMode === 'erd' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('erd')}
              className="h-8"
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Relationships
            </Button>
          </div>
          
          <Button onClick={() => setIsConnectionModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Connection
          </Button>
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
        </div>
      </header>

      {/* Resizable Layout */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Left Sidebar - Schema Browser */}
          <Panel 
            defaultSize={isSchemaExpanded ? 60 : 20} 
            minSize={15}
            maxSize={80}
            className="relative"
          >
            <div className="h-full bg-white border-r border-slate-200 flex flex-col">
              {/* Schema Header with Expand/Collapse */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-700">Schema & Connections</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSchemaExpanded(!isSchemaExpanded)}
                  className="h-6 w-6 p-0"
                >
                  {isSchemaExpanded ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              {/* Connection Selector */}
              <ConnectionSelector
                connections={connections || []}
                selectedConnectionId={selectedConnectionId}
                onConnectionChange={setSelectedConnectionId}
              />
              
              {/* Schema Browser */}
              <SchemaBrowser 
                connectionId={selectedConnectionId} 
                onTableClick={handleTableClick}
              />
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-slate-100 hover:bg-slate-200 transition-colors" />

          {/* Main Content Area */}
          <Panel defaultSize={80} minSize={40}>
            {viewMode === 'query' ? (
              <PanelGroup direction="vertical">
                {/* Query Editor Panel */}
                <Panel defaultSize={isResultsExpanded ? 30 : 60} minSize={25}>
                  <div className="h-full bg-white flex flex-col">
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
                        onQueryExecuted={handleQueryExecuted}
                      />
                    )}
                  </div>
                </Panel>

                <PanelResizeHandle className="h-2 bg-slate-100 hover:bg-slate-200 transition-colors" />

                {/* Results Panel */}
                <Panel defaultSize={isResultsExpanded ? 70 : 40} minSize={20}>
                  <div className="h-full bg-white">
                    {/* Results Header with Expand/Collapse */}
                    <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                      <h3 className="text-sm font-medium text-slate-700">Query Results</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsResultsExpanded(!isResultsExpanded)}
                        className="h-6 w-6 p-0"
                      >
                        {isResultsExpanded ? (
                          <Minimize2 className="w-4 h-4" />
                        ) : (
                          <Maximize2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    
                    <ResultsPanel 
                      connectionId={selectedConnectionId} 
                      paginationState={paginationState}
                      onPaginationChange={setPaginationState}
                    />
                  </div>
                </Panel>
              </PanelGroup>
            ) : (
              /* ERD View */
              <ERDViewer 
                connectionId={selectedConnectionId}
                onTableClick={handleTableClick}
              />
            )}
          </Panel>
        </PanelGroup>
      </div>

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        onConnectionCreated={() => setIsConnectionModalOpen(false)}
      />
    </div>
  );
}
