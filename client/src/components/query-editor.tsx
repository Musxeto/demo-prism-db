import React, { useEffect, useRef, useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { QueryResult } from "../../../shared/schema";
import { useQueryTabsStore, QueryTab } from "../contexts/query-tabs-store";
import { useConnection } from "../hooks/use-connections";
import { Button } from "./ui/button";
import { Play, Loader2, AlertCircle, Clock, Shield, FileText, X, AlertTriangle, BookmarkPlus } from "lucide-react";
import MonacoEditor, { MonacoEditorRef } from "./ui/monaco-editor";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { cn } from "../lib/utils";
import { QuerySafetyDialog } from "./query-safety-dialog";
import { SavedQueryModal } from "./saved-query-modal";
import { savedQueriesAPI } from "../lib/saved-queries-api";

// Extend Window interface for editor registry
declare global {
  interface Window {
    editorRegistry?: Map<string, () => void>;
  }
}

interface QueryEditorProps {
  tab: QueryTab;
  className?: string;
}

export default function QueryEditor({ tab, className }: QueryEditorProps) {
  const { toast } = useToast();
  const editorRef = useRef<MonacoEditorRef>(null);
  const [showSafetyDialog, setShowSafetyDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingQueryOptions, setPendingQueryOptions] = useState<{
    sql: string;
    page?: number;
    pageSize?: number;
  } | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState<{
    title: string;
    description: string;
  } | null>(null);

  // Get connection information
  const { data: connection } = useConnection(tab.connectionId);
  const isMongoDB = connection?.databaseType === 'mongodb';

  // Custom Error Popup Component
  const ErrorPopup = ({ 
    title, 
    description, 
    onClose 
  }: { 
    title: string; 
    description: string; 
    onClose: () => void; 
  }) => (
    <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-right-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-900">{title}</h4>
          <p className="text-sm text-red-700 mt-1 font-mono bg-red-100 p-2 rounded">{description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0 text-red-600 hover:text-red-900"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const showError = (title: string, description: string) => {
    setShowErrorPopup({ title, description });
    setTimeout(() => setShowErrorPopup(null), 6000);
  };

  const closeErrorPopup = () => {
    setShowErrorPopup(null);
  };

  const {
    updateTabQuery,
    setTabExecuting,
    setTabResult,
    setTabError,
    clearTabError,
    setTabScrollPosition,
    setTabCursorPosition,
    saveCurrentEditorContent,
  } = useQueryTabsStore();

  // Register this editor globally so tab switching can save content
  useEffect(() => {
    const saveContent = () => {
      if (editorRef.current) {
        const currentContent = editorRef.current.getValue();
        saveCurrentEditorContent(tab.id, currentContent);
      }
    };

    // Store the save function globally with tab ID
    if (!window.editorRegistry) {
      window.editorRegistry = new Map();
    }
    window.editorRegistry.set(tab.id, saveContent);

    return () => {
      // Clean up when component unmounts
      if (window.editorRegistry) {
        window.editorRegistry.delete(tab.id);
      }
    };
  }, [tab.id, saveCurrentEditorContent]);

  // Detect dangerous and multi-statement queries
  const analyzeQuery = (sql: string) => {
    if (isMongoDB) {
      // MongoDB query analysis
      const isMultiStatement = sql.includes('\n') && sql.trim().split('\n').filter(line => line.trim() && !line.trim().startsWith('//')).length > 1;
      
      // MongoDB dangerous patterns
      const isDangerous = /\b(drop|dropDatabase|deleteMany|updateMany)\s*\(/i.test(sql);
      
      const warnings: string[] = [];
      if (isDangerous) {
        if (/drop\s*\(/i.test(sql)) warnings.push("This query contains DROP operations!");
        if (/dropDatabase\s*\(/i.test(sql)) warnings.push("This query will DROP an entire database!");
        if (/deleteMany\s*\(/i.test(sql)) warnings.push("This query will delete multiple documents!");
        if (/updateMany\s*\(/i.test(sql)) warnings.push("This query will update multiple documents!");
      }
      
      if (isMultiStatement) {
        const statements = sql.trim().split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
        warnings.push(`This query contains ${statements.length} MongoDB operations that will be executed in sequence.`);
      }

      return { isDangerous, isMultiStatement, warnings, statementCount: isMultiStatement ? sql.trim().split('\n').filter(line => line.trim() && !line.trim().startsWith('//')).length : 1 };
    } else {
      // SQL query analysis (existing logic)
      const statements = splitSQLStatements(sql);
      const dangerousPatterns = [
        /DROP\s+DATABASE/i,
        /DROP\s+SCHEMA/i,
        /TRUNCATE\s+TABLE/i,
        /DELETE\s+FROM\s+\w+\s*(?:;|$)/i, // DELETE without WHERE
        /UPDATE\s+\w+\s+SET\s+.*?(?:;|$)(?!.*WHERE)/i, // UPDATE without WHERE
      ];

      const isDangerous = dangerousPatterns.some(pattern => pattern.test(sql));
      const isMultiStatement = statements.length > 1;
      
      const warnings: string[] = [];
      if (isDangerous) {
        if (/DROP\s+DATABASE/i.test(sql)) warnings.push("This query will DROP an entire database!");
        if (/TRUNCATE/i.test(sql)) warnings.push("This query will TRUNCATE a table (delete all rows)!");
        if (/DELETE\s+FROM\s+\w+\s*(?:;|$)/i.test(sql)) warnings.push("This DELETE query has no WHERE clause!");
        if (/UPDATE\s+\w+\s+SET\s+.*?(?:;|$)(?!.*WHERE)/i.test(sql)) warnings.push("This UPDATE query has no WHERE clause!");
      }
      if (isMultiStatement) {
        warnings.push(`This query contains ${statements.length} statements that will be executed in sequence.`);
      }

      return { isDangerous, isMultiStatement, warnings, statementCount: statements.length };
    }
  };

  const splitSQLStatements = (sql: string): string[] => {
    const statements: string[] = [];
    let current = "";
    let inString = false;
    let stringChar: string | null = null;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar) {
        inString = false;
        stringChar = null;
      } else if (!inString && char === ';') {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = "";
        continue;
      }
      
      current += char;
    }
    
    if (current.trim()) {
      statements.push(current.trim());
    }
    
    return statements;
  };

  // Execute query mutation
  const executeQueryMutation = useMutation({
    mutationFn: async ({ 
      connectionId, 
      sql, 
      tabId, // Add tabId here
      page = 1, 
      pageSize = 100, 
      allowMultiple = false, 
      confirmDangerous = false 
    }: { 
      connectionId: number; 
      sql: string; 
      tabId: string; // Add tabId here
      page?: number; 
      pageSize?: number; 
      allowMultiple?: boolean;
      confirmDangerous?: boolean;
    }) => {
      const response = await apiRequest("POST", `/api/connections/${connectionId}/query`, { 
        sql, 
        tabId,
        page, 
        pageSize,
        allowMultiple,
        confirmDangerous
      });
      return response.json();
    },
    onSuccess: (result: QueryResult) => {
      setTabResult(tab.id, result, tab.query);
      
      // Show appropriate success message
      let title = "Query executed successfully";
      let description = `Completed in ${result.executionTimeMs}ms`;
      
      if (result.type === 'select') {
        if (result.rowCount !== undefined) {
          description += ` • ${result.rowCount} rows`;
          if (result.totalRows && result.totalRows > result.rowCount) {
            description += ` of ${result.totalRows} total`;
          }
        }
      } else if (result.type === 'write') {
        title = "Data modification completed";
        if (result.affectedRows !== undefined) {
          description += ` • ${result.affectedRows} rows affected`;
        }
      } else if (result.type === 'ddl') {
        title = "DDL operation completed";
        description = result.message || description;
      } else if (result.type === 'multi') {
        title = "Multi-statement query completed";
        if (result.results) {
          description += ` • ${result.results.length} statements executed`;
        }
      }
      
      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        toast({
          variant: "default",
          title: "Query executed with warnings",
          description: result.warnings.join('; '),
        });
      } else {
        toast({
          title,
          description,
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to execute query";
      setTabError(tab.id, errorMessage);
      toast({
        variant: "destructive",
        title: "Query execution failed",
        description: errorMessage,
      });
    },
    onSettled: () => {
      setTabExecuting(tab.id, false);
    },
  });

  // Handle query execution with safety checks
  const handleExecuteQuery = useCallback((options?: { page?: number; pageSize?: number }) => {
    // Force sync the editor content with the tab state before execution
    if (editorRef.current) {
      const currentEditorValue = editorRef.current.getValue();
      if (currentEditorValue !== tab.query) {
        updateTabQuery(tab.id, currentEditorValue);
      }
    }
    
    // Get the latest query content (possibly just updated)
    const currentQuery = editorRef.current ? editorRef.current.getValue() : tab.query;
    
    if (!currentQuery.trim()) {
      toast({
        variant: "destructive",
        title: "No query to execute",
        description: `Please enter a ${isMongoDB ? 'MongoDB query' : 'SQL query'} first.`,
      });
      return;
    }
    
    // Use the synced currentQuery instead of tab.query
    const analysis = analyzeQuery(currentQuery);
    
    // If query is potentially dangerous or multi-statement, show safety dialog
    if (analysis.isDangerous || analysis.isMultiStatement) {
      setPendingQueryOptions({
        sql: currentQuery,
        page: options?.page || 1,
        pageSize: options?.pageSize || 100,
      });
      setShowSafetyDialog(true);
      return;
    }

    // Execute immediately for safe, single-statement queries
    executeQueryDirectly({
      sql: currentQuery,
      page: options?.page || 1,
      pageSize: options?.pageSize || 100,
    });
  }, [tab.query, tab.id, toast, updateTabQuery]);

  const executeQueryDirectly = useCallback((params: {
    sql: string;
    page?: number;
    pageSize?: number;
    allowMultiple?: boolean;
    confirmDangerous?: boolean;
  }) => {
    clearTabError(tab.id);
    setTabExecuting(tab.id, true);
    executeQueryMutation.mutate({
      connectionId: tab.connectionId,
      tabId: tab.id,
      ...params,
    });
  }, [tab.connectionId, tab.id, executeQueryMutation, clearTabError, setTabExecuting]);

  const handleSaveQuery = useCallback(async (queryData: any) => {
    try {
      await savedQueriesAPI.createQuery({
        ...queryData,
        connection_id: tab.connectionId
      });
      setShowSaveDialog(false);
      toast({
        title: "Query Saved",
        description: `Successfully saved query "${queryData.name}"`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save query",
        duration: 5000,
      });
    }
  }, [tab.query, tab.connectionId, toast]);

  const handleSafetyConfirm = useCallback((safetyOptions: { 
    allowMultiple?: boolean; 
    confirmDangerous?: boolean 
  }) => {
    if (pendingQueryOptions) {
      executeQueryDirectly({
        ...pendingQueryOptions,
        ...safetyOptions,
      });
      setPendingQueryOptions(null);
    }
  }, [pendingQueryOptions, executeQueryDirectly]);

  const handleSafetyCancel = useCallback(() => {
    setShowSafetyDialog(false);
    setPendingQueryOptions(null);
  }, []);

  // Handle editor content change
  const handleEditorChange = useCallback((value: string | undefined) => {
    const newQuery = value || '';
    // Only update the tab query if it's actually different
    if (newQuery !== tab.query) {
      updateTabQuery(tab.id, newQuery);
    }
  }, [tab.id, tab.query, updateTabQuery]);

  // Sync editor content when tab changes - this is the main sync effect
  useEffect(() => {
    if (editorRef.current) {
      // When switching tabs, always set the editor to the tab's current query
      // This ensures we get the latest content for this specific tab
      editorRef.current.setValue(tab.query || '');
      // Focus the editor when switching tabs
      editorRef.current.focus();
    }
  }, [tab.id]); // Only depend on tab.id to sync when switching tabs

  // Listen for custom execute query events from Monaco
  useEffect(() => {
    const handleExecuteQueryEvent = () => {
      handleExecuteQuery();
    };

    window.addEventListener('executeQuery', handleExecuteQueryEvent);
    return () => {
      window.removeEventListener('executeQuery', handleExecuteQueryEvent);
    };
  }, [handleExecuteQuery]);

  // Show error popup when tab.error changes
  useEffect(() => {
    if (tab.error) {
      showError("Query Error", tab.error);
      // Clear the tab error after showing popup to prevent repeated displays
      setTimeout(() => clearTabError(tab.id), 100);
    }
  }, [tab.error, tab.id, clearTabError]);

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const queryAnalysis = analyzeQuery(tab.query);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            disabled={tab.isExecuting}
            onClick={() => handleExecuteQuery()}
            className="flex items-center gap-1"
          >
            {tab.isExecuting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {tab.isExecuting ? "Executing..." : "Run Query"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={!tab.query.trim()}
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-1"
          >
            <BookmarkPlus className="h-4 w-4" />
            Save
          </Button>

          {/* Safety indicators */}
          {queryAnalysis.isDangerous && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <Shield className="h-3 w-3" />
              Dangerous
            </div>
          )}
          {queryAnalysis.isMultiStatement && (
            <div className="flex items-center gap-1 text-xs text-orange-600">
              <FileText className="h-3 w-3" />
              Multi-statement ({queryAnalysis.statementCount})
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Ctrl/Cmd + Enter to execute
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {tab.result && (
            <>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatExecutionTime(tab.result.executionTimeMs)}
              </div>
              {tab.result.rowCount !== undefined && (
                <div>
                  {tab.result.rowCount} rows
                </div>
              )}
              {tab.result.affectedRows !== undefined && (
                <div>
                  {tab.result.affectedRows} affected
                </div>
              )}
            </>
          )}
          {tab.hasUnsavedChanges && (
            <div className="text-orange-600">
              Unsaved changes
            </div>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          ref={editorRef}
          value={tab.query}
          initialValue={tab.query}
          onChange={handleEditorChange}
          language={isMongoDB ? "javascript" : "sql"}
          options={{
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            tabSize: 2,
          }}
        />
      </div>

      {/* Safety Dialog */}
      {showSafetyDialog && pendingQueryOptions && (
        <QuerySafetyDialog
          isOpen={showSafetyDialog}
          onClose={handleSafetyCancel}
          onConfirm={handleSafetyConfirm}
          sql={pendingQueryOptions.sql}
          warnings={queryAnalysis.warnings}
          isDangerous={queryAnalysis.isDangerous}
          isMultiStatement={queryAnalysis.isMultiStatement}
        />
      )}

      {/* Error Popup */}
      {showErrorPopup && (
        <ErrorPopup
          title={showErrorPopup.title}
          description={showErrorPopup.description}
          onClose={closeErrorPopup}
        />
      )}

      {/* Save Query Modal */}
      {showSaveDialog && (
        <SavedQueryModal
          initialData={{
            sql: tab.query,
            connection_id: tab.connectionId
          }}
          onSave={handleSaveQuery}
          onClose={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
}
