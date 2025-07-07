import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryResult } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Play, FileText } from "lucide-react";
import MonacoEditor from "@/components/ui/monaco-editor";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QueryTab {
  id: string;
  name: string;
  sql: string;
  connectionId: number;
  isActive: boolean;
}

interface QueryEditorProps {
  tab: QueryTab;
  onSqlChange: (sql: string) => void;
}

export default function QueryEditor({ tab, onSqlChange }: QueryEditorProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecutionTime, setLastExecutionTime] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const executeQueryMutation = useMutation({
    mutationFn: async ({ connectionId, sql }: { connectionId: number; sql: string }) => {
      const response = await apiRequest("POST", `/api/connections/${connectionId}/query`, { sql });
      return response.json();
    },
    onSuccess: (result: QueryResult) => {
      setLastExecutionTime(result.executionTime);
      queryClient.setQueryData(["query-result", tab.connectionId], result);
      toast({
        title: "Query executed successfully",
        description: `${result.rowCount} rows returned in ${result.executionTime}ms`,
      });
    },
    onError: (error) => {
      toast({
        title: "Query execution failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsExecuting(false);
    },
  });

  const handleExecuteQuery = () => {
    if (!tab.sql.trim()) {
      toast({
        title: "No query to execute",
        description: "Please enter a SQL query before executing",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    executeQueryMutation.mutate({
      connectionId: tab.connectionId,
      sql: tab.sql,
    });
  };

  const handleFormatSql = () => {
    // Basic SQL formatting - in a real implementation, you'd use a proper SQL formatter
    const formatted = tab.sql
      .replace(/\s+/g, ' ')
      .replace(/SELECT/gi, '\nSELECT')
      .replace(/FROM/gi, '\nFROM')
      .replace(/WHERE/gi, '\nWHERE')
      .replace(/GROUP BY/gi, '\nGROUP BY')
      .replace(/ORDER BY/gi, '\nORDER BY')
      .replace(/HAVING/gi, '\nHAVING')
      .replace(/LIMIT/gi, '\nLIMIT')
      .trim();
    
    onSqlChange(formatted);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Query Editor Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm text-slate-600">
              Connected to: <span className="font-medium">Production MySQL</span>
            </span>
          </div>
          <div className="text-sm text-slate-500">
            {isExecuting ? "Executing..." : "Ready to execute"}
          </div>
          {lastExecutionTime && (
            <div className="text-sm text-slate-500">
              Last execution: {lastExecutionTime}ms
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleFormatSql}>
            <FileText className="w-4 h-4 mr-2" />
            Format SQL
          </Button>
          <Button 
            size="sm" 
            onClick={handleExecuteQuery}
            disabled={isExecuting}
          >
            <Play className="w-4 h-4 mr-2" />
            {isExecuting ? "Running..." : "Run Query"}
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative">
        <MonacoEditor
          value={tab.sql}
          onChange={onSqlChange}
          language="sql"
          theme="vs"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: "on",
            renderWhitespace: "selection",
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
