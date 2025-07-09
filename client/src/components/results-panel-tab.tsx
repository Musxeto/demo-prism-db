import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { QueryResult } from "../../../shared/schema";
import { QueryTab, useQueryTabsStore } from "../contexts/query-tabs-store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Download, 
  Copy, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  AlertCircle,
  FileText,
  Database,
  Clock,
  Zap,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { cn } from "../lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface ResultsPanelTabProps {
  tab: QueryTab;
  className?: string;
}

// Custom Success Popup Component
function SuccessPopup({ 
  title, 
  description, 
  onClose 
}: { 
  title: string; 
  description: string; 
  onClose: () => void; 
}) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md">
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-green-900">{title}</h4>
          <p className="text-sm text-green-700 mt-1">{description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0 text-green-600 hover:text-green-900"
        >
          ×
        </Button>
      </div>
    </div>
  );
}

// Custom Error Popup Component
function ErrorPopup({ 
  title, 
  description, 
  onClose 
}: { 
  title: string; 
  description: string; 
  onClose: () => void; 
}) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-900">{title}</h4>
          <p className="text-sm text-red-700 mt-1">{description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0 text-red-600 hover:text-red-900"
        >
          ×
        </Button>
      </div>
    </div>
  );
}

export function ResultsPanelTab({ tab, className }: ResultsPanelTabProps) {
  const { toast } = useToast();
  const [jumpToPage, setJumpToPage] = useState<string>('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState({ title: '', description: '' });
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

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (pageNum && pageNum > 0 && tab.result?.totalPages && pageNum <= tab.result.totalPages) {
      handlePageChange(pageNum);
      setJumpToPage('');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Data copied successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Failed to copy to clipboard",
      });
    }
  };

  const exportToCSV = () => {
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

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getResultIcon = () => {
    if (!tab.result) return null;
    
    switch (tab.result.type) {
      case 'select':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'write':
        return <Zap className="h-4 w-4 text-green-500" />;
      case 'ddl':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'multi':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getResultBadgeVariant = () => {
    if (!tab.result) return "secondary";
    
    switch (tab.result.type) {
      case 'select':
        return "default";
      case 'write':
        return "default";
      case 'ddl':
        return "secondary";
      case 'multi':
        return "outline";
      case 'error':
        return "destructive";
      default:
        return "secondary";
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

  // Handle error results
  if (tab.result.type === 'error') {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getResultIcon()}
              <h3 className="text-lg font-semibold">Query Error</h3>
              <Badge variant={getResultBadgeVariant()}>
                {tab.result.type?.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatExecutionTime(tab.result.executionTimeMs)}
            </div>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {tab.result.message || 'An error occurred while executing the query.'}
            </AlertDescription>
          </Alert>

          {tab.result.warnings && tab.result.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {tab.result.warnings.map((warning, index) => (
                    <div key={index}>• {warning}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }

  // Handle write operations (INSERT, UPDATE, DELETE)
  if (tab.result.type === 'write') {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getResultIcon()}
              <h3 className="text-lg font-semibold">Data Modification Results</h3>
              <Badge variant={getResultBadgeVariant()}>
                {tab.result.type?.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatExecutionTime(tab.result.executionTimeMs)}
            </div>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              {tab.result.message || 'Operation completed successfully.'}
            </AlertDescription>
          </Alert>
          
          {tab.result.affectedRows !== undefined && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Rows affected: <strong>{tab.result.affectedRows}</strong></span>
            </div>
          )}

          {tab.result.warnings && tab.result.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {tab.result.warnings.map((warning, index) => (
                    <div key={index}>• {warning}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }

  // Handle DDL operations (CREATE, ALTER, DROP, etc.)
  if (tab.result.type === 'ddl') {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getResultIcon()}
              <h3 className="text-lg font-semibold">DDL Operation Results</h3>
              <Badge variant={getResultBadgeVariant()}>
                {tab.result.type?.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatExecutionTime(tab.result.executionTimeMs)}
            </div>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              {tab.result.message || 'DDL operation completed successfully.'}
            </AlertDescription>
          </Alert>
          
          {tab.result.queryType && (
            <div className="text-sm text-muted-foreground">
              Operation type: <Badge variant="outline">{tab.result.queryType.toUpperCase()}</Badge>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Handle SELECT results (default case)
  const result = tab.result;
  
  if (!result.columns || !result.rows) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="p-4">
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Query executed successfully but returned no data.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {getResultIcon()}
          <h3 className="text-lg font-semibold">Query Results</h3>
          <Badge variant={getResultBadgeVariant()}>
            {result.type?.toUpperCase()}
          </Badge>
          {result.isDangerous && (
            <Badge variant="destructive" className="text-xs">
              ⚠️ DANGEROUS
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatExecutionTime(result.executionTimeMs)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(result.rows, null, 2))}
              className="gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="gap-1"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="p-4 pb-0">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {result.warnings.map((warning, index) => (
                  <div key={index}>• {warning}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Results Stats */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Showing {result.rowCount} of {result.totalRows || result.rowCount} rows
          </span>
          {result.page && result.totalPages && (
            <span>
              Page {result.page} of {result.totalPages}
            </span>
          )}
        </div>
        
        {/* Pagination Controls */}
        {result.totalPages && result.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!result.page || result.page <= 1 || paginationMutation.isPending}
              onClick={() => handlePageChange(1)}
            >
              <ChevronsLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!result.page || result.page <= 1 || paginationMutation.isPending}
              onClick={() => handlePageChange(result.page! - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="Page"
                value={jumpToPage}
                onChange={(e) => setJumpToPage(e.target.value)}
                className="w-16 h-8 text-center"
                min={1}
                max={result.totalPages}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleJumpToPage}
                disabled={!jumpToPage || paginationMutation.isPending}
              >
                Go
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              disabled={!result.page || !result.totalPages || result.page >= result.totalPages || paginationMutation.isPending}
              onClick={() => handlePageChange(result.page! + 1)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!result.page || !result.totalPages || result.page >= result.totalPages || paginationMutation.isPending}
              onClick={() => handlePageChange(result.totalPages!)}
            >
              <ChevronsRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="border rounded-md h-full">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  {result.columns.map((column, index) => (
                    <TableHead key={index} className="min-w-[100px]">
                      <div className="space-y-1">
                        <div className="font-medium">{column.name}</div>
                        <div className="text-xs text-muted-foreground">{column.type}</div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex} className="max-w-xs">
                        <div className="truncate" title={String(cell || '')}>
                          {cell === null ? (
                            <span className="text-muted-foreground italic">NULL</span>
                          ) : (
                            String(cell)
                          )}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
