import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { QueryResult } from "../../../shared/schema";
import { QueryTab, useQueryTabsStore } from "../contexts/query-tabs-store";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { cn } from "../lib/utils";
import { EnhancedResultsPanel } from "./enhanced-results-panel";

interface ResultsPanelTabProps {
  tab: QueryTab;
  className?: string;
}

export function ResultsPanelTab({ tab, className }: ResultsPanelTabProps) {
  const { toast } = useToast();
  const { setTabResult } = useQueryTabsStore();

  // Pagination mutation
  const paginationMutation = useMutation({
    mutationFn: async ({ sql, page, pageSize }: { 
      sql: string; 
      page: number; 
      pageSize: number 
    }) => {
      const response = await apiRequest("POST", `/api/connections/${tab.connectionId}/query`, { 
        sql, 
        page, 
        pageSize,
        allowMultiple: false,
        confirmDangerous: true // Already confirmed if we're here
      });
      return response.json();
    },
    onSuccess: (result: QueryResult) => {
      setTabResult(tab.id, result, tab.lastExecutedQuery || '');
      toast({
        title: "Page loaded",
        description: `Page ${result.page} of ${result.totalPages}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to load page",
        description: error?.message || "Unknown error occurred",
      });
    },
  });

  const handlePageChange = (page: number) => {
    if (!tab.lastExecutedQuery || !tab.result) return;
    
    paginationMutation.mutate({
      sql: tab.lastExecutedQuery,
      page,
      pageSize: tab.result.pageSize || 100,
    });
  };

  const handleExport = () => {
    if (!tab.result || !tab.result.rows) {
      toast({
        variant: "destructive",
        title: "Nothing to export",
        description: "No data available to export",
      });
      return;
    }

    try {
      // Create CSV content
      const headers = tab.result.columns?.map(col => col.name) || [];
      const csvContent = [
        headers.join(','),
        ...tab.result.rows.map(row => 
          row.map(cell => 
            typeof cell === 'string' && cell.includes(',') 
              ? `"${cell.replace(/"/g, '""')}"` 
              : String(cell || '')
          ).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query-results-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Results exported to CSV file",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to export results",
      });
    }
  };

  if (tab.isExecuting) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-muted-foreground">Executing query...</p>
          </div>
        </div>
      </div>
    );
  }

  if (tab.error) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {tab.error}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!tab.result) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-muted-foreground">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">No query results</h3>
            <p className="text-muted-foreground">
              Execute a SQL query to see results here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1 p-4 overflow-auto">
        <EnhancedResultsPanel 
          result={tab.result}
          onPageChange={handlePageChange}
          onExport={handleExport}
        />
      </div>
    </div>
  );
}
