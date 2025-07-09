import React, { useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { QueryResult } from "../../../shared/schema";
import { useQueryTabsStore, QueryTab } from "../contexts/query-tabs-store";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Play, Loader2, AlertCircle, Clock } from "lucide-react";
import MonacoEditor from "./ui/monaco-editor";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { cn } from "../lib/utils";

interface QueryEditorProps {
  tab: QueryTab;
  className?: string;
}

export default function QueryEditor({ tab, className }: QueryEditorProps) {
  const { toast } = useToast();
  const editorRef = useRef<any>(null);
  const {
    updateTabQuery,
    setTabExecuting,
    setTabResult,
    setTabError,
    clearTabError,
    setTabScrollPosition,
    setTabCursorPosition,
  } = useQueryTabsStore();

  // Execute query mutation
  const executeQueryMutation = useMutation({
    mutationFn: async ({ connectionId, sql, page = 1, pageSize = 100 }: { 
      connectionId: number; 
      sql: string; 
      page?: number; 
      pageSize?: number; 
    }) => {
      const response = await apiRequest("POST", `/api/connections/${connectionId}/query`, { 
        sql, 
        page, 
        pageSize 
      });
      return response.json();
    },
    onSuccess: (result: QueryResult) => {
      setTabResult(tab.id, result, tab.query);
      toast({
        title: "Query executed successfully",
        description: `Completed in ${result.executionTimeMs}ms`,
      });
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

  // Handle query execution
  const handleExecuteQuery = useCallback(() => {
    if (!tab.query.trim()) {
      toast({
        variant: "destructive",
        title: "No query to execute",
        description: "Please enter a SQL query first.",
      });
      return;
    }

    clearTabError(tab.id);
    setTabExecuting(tab.id, true);
    executeQueryMutation.mutate({
      connectionId: tab.connectionId,
      sql: tab.query,
    });
  }, [tab.query, tab.connectionId, tab.id, executeQueryMutation, clearTabError, setTabExecuting, toast]);

  // Handle editor content change
  const handleEditorChange = useCallback((value: string | undefined) => {
    updateTabQuery(tab.id, value || '');
  }, [tab.id, updateTabQuery]);

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor: any) => {
    editorRef.current = editor;
    
    // Restore cursor position if available
    if (tab.cursorPosition) {
      editor.setPosition({
        lineNumber: tab.cursorPosition.line,
        column: tab.cursorPosition.column,
      });
    }

    // Restore scroll position if available
    if (tab.scrollPosition) {
      editor.setScrollPosition({
        scrollTop: tab.scrollPosition.top,
        scrollLeft: tab.scrollPosition.left,
      });
    }

    // Add keyboard shortcuts
    editor.addCommand(editor.KeyMod.CtrlCmd | editor.KeyCode.Enter, () => {
      handleExecuteQuery();
    });

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e: any) => {
      setTabCursorPosition(tab.id, {
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // Track scroll position changes
    editor.onDidScrollChange((e: any) => {
      setTabScrollPosition(tab.id, {
        top: e.scrollTop,
        left: e.scrollLeft,
      });
    });

    // Focus the editor
    editor.focus();
  }, [tab.cursorPosition, tab.scrollPosition, tab.id, handleExecuteQuery, setTabCursorPosition, setTabScrollPosition]);

  // Focus editor when tab becomes active
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, [tab.id]);

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExecuteQuery}
            disabled={tab.isExecuting || !tab.query.trim()}
            size="sm"
            className="gap-2"
          >
            {tab.isExecuting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {tab.isExecuting ? "Executing..." : "Run Query"}
          </Button>

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
            </>
          )}
          {tab.hasUnsavedChanges && (
            <div className="text-orange-600">
              Unsaved changes
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {tab.error && (
        <Alert variant="destructive" className="m-3 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {tab.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          value={tab.query}
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
    </div>
  );
}
