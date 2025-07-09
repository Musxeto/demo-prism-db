import React, { useEffect, useRef, useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { QueryResult } from "../../../shared/schema";
import { useQueryTabsStore, QueryTab } from "../contexts/query-tabs-store";
import { Button } from "./ui/button";
import { Play, Loader2, AlertCircle, Clock, Shield, FileText, X, AlertTriangle } from "lucide-react";
import MonacoEditor, { MonacoEditorRef } from "./ui/monaco-editor";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { cn } from "../lib/utils";
import { QuerySafetyDialog } from "./query-safety-dialog";

interface QueryEditorProps {
  tab: QueryTab;
  className?: string;
}

export default function QueryEditor({ tab, className }: QueryEditorProps) {
  const { toast } = useToast();
  const editorRef = useRef<MonacoEditorRef>(null);
  const [showSafetyDialog, setShowSafetyDialog] = useState(false);
  const [pendingQueryOptions, setPendingQueryOptions] = useState<{
    sql: string;
    page?: number;
    pageSize?: number;
  } | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState<{
    title: string;
    description: string;
  } | null>(null);

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
  } = useQueryTabsStore();

  // Detect dangerous and multi-statement queries
  const analyzeQuery = (sql: string) => {
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
        description: "Please enter a SQL query first.",
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
    // Immediately update the tab query
    updateTabQuery(tab.id, newQuery);
  }, [tab.id, updateTabQuery]);

  // Sync editor content when tab changes
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      // Only update if the values are different to avoid infinite loops
      if (currentValue !== tab.query) {
        editorRef.current.setValue(tab.query || '');
      }
    }
  }, [tab.id]); // Only depend on tab.id to sync when switching tabs

  // Separate effect to handle query content updates
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      // If the tab query changed externally, update the editor
      if (currentValue !== tab.query) {
        editorRef.current.setValue(tab.query || '');
      }
    }
  }, [tab.query]);

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

  // Force sync editor content to tab state when tab becomes active
  useEffect(() => {
    if (editorRef.current) {
      // Get current editor content and sync it to the tab
      const currentValue = editorRef.current.getValue();
      if (currentValue !== tab.query) {
        // Always update the tab query to match editor content
        updateTabQuery(tab.id, currentValue);
      }
      // Focus the editor
      editorRef.current.focus();
    }
  }, [tab.id, updateTabQuery]);

  // Also force sync when the component mounts
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue && currentValue !== tab.query) {
        updateTabQuery(tab.id, currentValue);
      }
    }
  }, []);

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
          language="sql"
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
    </div>
  );
}
