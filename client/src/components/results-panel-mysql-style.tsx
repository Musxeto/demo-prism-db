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
  AlertTriangle,
  X
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
    <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-right-4">
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
          <X className="h-4 w-4" />
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
    <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-right-4">
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
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Custom Info Popup Component
function InfoPopup({ 
  title, 
  description, 
  onClose 
}: { 
  title: string; 
  description: string; 
  onClose: () => void; 
}) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-right-4">
      <div className="flex items-start gap-3">
        <Database className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900">{title}</h4>
          <p className="text-sm text-blue-700 mt-1">{description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-900"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ResultsPanelTab({ tab, className }: ResultsPanelTabProps) {
  const { toast } = useToast();
  const [jumpToPage, setJumpToPage] = useState<string>('');
  const [showPopup, setShowPopup] = useState<{
    type: 'success' | 'error' | 'info' | null;
    title: string;
    description: string;
  }>({ type: null, title: '', description: '' });
  const { setTabResult } = useQueryTabsStore();

  // Custom popup functions
  const showSuccessPopup = (title: string, description: string) => {
    setShowPopup({ type: 'success', title, description });
    setTimeout(() => setShowPopup({ type: null, title: '', description: '' }), 4000);
  };

  const showErrorPopup = (title: string, description: string) => {
    setShowPopup({ type: 'error', title, description });
    setTimeout(() => setShowPopup({ type: null, title: '', description: '' }), 6000);
  };

  const showInfoPopup = (title: string, description: string) => {
    setShowPopup({ type: 'info', title, description });
    setTimeout(() => setShowPopup({ type: null, title: '', description: '' }), 4000);
  };

  const closePopup = () => {
    setShowPopup({ type: null, title: '', description: '' });
  };

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
        confirmDangerous: true
      });
      return response.json();
    },
    onSuccess: (result: QueryResult) => {
      setTabResult(tab.id, result, tab.lastExecutedQuery || '');
      showSuccessPopup(
        "Page loaded",
        `Page ${result.page} of ${result.totalPages} loaded successfully`
      );
    },
    onError: (error: any) => {
      showErrorPopup(
        "Failed to load page",
        error?.message || "Unknown error occurred"
      );
    },
  });

  const handlePageChange = (page: number) => {
    if (!tab.lastExecutedQuery || !tab.result) return;
    
    paginationMutation.mutate({
      sql: tab.lastExecutedQuery,
      page,
      pageSize: tab.result.pageSize || 10, // Changed from 100 to 10
    });
  };

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (pageNum && tab.result && pageNum > 0 && pageNum <= (tab.result.totalPages || 1)) {
      handlePageChange(pageNum);
      setJumpToPage('');
    } else {
      showErrorPopup(
        "Invalid page number",
        `Please enter a page number between 1 and ${tab.result?.totalPages || 1}`
      );
    }
  };

  const copyData = () => {
    if (!tab.result || !tab.result.rows) return;
    
    try {
      const headers = tab.result.columns?.map(col => col.name) || [];
      const csvContent = [
        headers.join('\t'),
        ...tab.result.rows.map(row => row.map(cell => String(cell || '')).join('\t'))
      ].join('\n');
      
      navigator.clipboard.writeText(csvContent);
      showSuccessPopup(
        "Data copied",
        "Table data copied to clipboard as tab-separated values"
      );
    } catch (error) {
      showErrorPopup(
        "Copy failed",
        "Failed to copy data to clipboard"
      );
    }
  };

  const exportData = () => {
    if (!tab.result || !tab.result.rows) {
      showErrorPopup(
        "Nothing to export",
        "No data available to export"
      );
      return;
    }

    try {
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

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query-results-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessPopup(
        "Export successful",
        "Results exported to CSV file"
      );
    } catch (error) {
      showErrorPopup(
        "Export failed",
        "Failed to export results"
      );
    }
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
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
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-900">Query Error</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 font-mono text-sm bg-red-100 p-3 rounded border">
                {tab.error}
              </p>
            </CardContent>
          </Card>
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
              <Database className="w-16 h-16 mx-auto mb-4" />
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

  // Handle different result types
  const renderResultContent = () => {
    if (tab.result?.type === 'error') {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">Query Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 font-mono text-sm bg-red-100 p-3 rounded border">
              {tab.result.message}
            </p>
          </CardContent>
        </Card>
      );
    }

    if (tab.result?.type === 'write' || tab.result?.type === 'ddl') {
      return (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-900">
                {tab.result.type === 'write' ? 'Data Modification' : 'DDL Operation'} Completed
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-green-700">{tab.result.message}</p>
              {tab.result.affectedRows !== undefined && (
                <p className="text-sm text-green-600">
                  <strong>Rows affected:</strong> {tab.result.affectedRows}
                </p>
              )}
              <p className="text-sm text-green-600">
                <strong>Execution time:</strong> {formatExecutionTime(tab.result.executionTimeMs)}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (tab.result?.type === 'multi') {
      return (
        <div className="space-y-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-blue-900">Multi-Statement Results</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-blue-700">{tab.result.message}</p>
                <p className="text-sm text-blue-600">
                  <strong>Execution time:</strong> {formatExecutionTime(tab.result.executionTimeMs)}
                </p>
                {tab.result.affectedRows && (
                  <p className="text-sm text-blue-600">
                    <strong>Total rows affected:</strong> {tab.result.affectedRows}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Show last result if it's a SELECT */}
          {tab.result.rows && tab.result.columns && renderDataTable()}
        </div>
      );
    }

    // Default: SELECT results
    return renderDataTable();
  };

  const renderDataTable = () => {
    if (!tab.result?.columns || !tab.result?.rows) {
      return (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900">Query Completed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700">Query executed successfully but returned no data.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {/* Result Header */}
        <div className="flex items-center justify-between p-4 bg-muted/30 border rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Query Results</span>
              <Badge variant="outline">{tab.result.type?.toUpperCase()}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {tab.result.totalRows !== undefined ? (
                <>
                  Showing {tab.result.rowCount} of {tab.result.totalRows} rows
                  {tab.result.page && tab.result.totalPages && (
                    <> • Page {tab.result.page} of {tab.result.totalPages}</>
                  )}
                </>
              ) : (
                `${tab.result.rowCount} rows`
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatExecutionTime(tab.result.executionTimeMs)}
            </div>
            <Button variant="outline" size="sm" onClick={copyData}>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* MySQL Workbench-style Data Table */}
        <div className="border rounded-lg bg-white shadow-sm">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-100 border-b-2 border-gray-300">
                <TableRow className="hover:bg-gray-100">
                  {tab.result.columns.map((column, index) => (
                    <TableHead key={index} className="font-semibold text-gray-800 border-r border-gray-300 last:border-r-0 px-3 py-2">
                      <div className="space-y-1">
                        <div className="text-sm">{column.name}</div>
                        <div className="text-xs text-gray-600 font-normal uppercase">{column.type}</div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tab.result.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-blue-50 even:bg-gray-50/50">
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex} className="border-r border-gray-200 last:border-r-0 font-mono text-sm px-3 py-2">
                        {cell === null ? (
                          <span className="text-gray-500 italic bg-gray-200 px-2 py-0.5 rounded text-xs font-sans">NULL</span>
                        ) : cell === '' ? (
                          <span className="text-gray-500 italic font-sans text-xs">(empty)</span>
                        ) : (
                          <div className="max-w-xs truncate" title={String(cell)}>
                            {String(cell)}
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* Enhanced Pagination */}
        {tab.result.totalPages && tab.result.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex items-center gap-6">
              <div className="text-sm text-gray-700 font-medium">
                Page {tab.result.page} of {tab.result.totalPages}
              </div>
              <div className="text-sm text-gray-600">
                Showing {tab.result.rowCount} of {tab.result.totalRows} rows
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Jump to:</span>
                <Input
                  type="number"
                  min="1"
                  max={tab.result.totalPages}
                  value={jumpToPage}
                  onChange={(e) => setJumpToPage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()}
                  className="w-20 h-8 text-center"
                  placeholder="Page"
                />
                <Button variant="outline" size="sm" onClick={handleJumpToPage} className="px-3">
                  Go
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!tab.result.page || tab.result.page <= 1}
                onClick={() => handlePageChange(1)}
                className="px-2"
                title="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!tab.result?.page || tab.result.page <= 1}
                onClick={() => tab.result?.page && handlePageChange(tab.result.page - 1)}
                className="px-2"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-3 py-1 text-sm bg-white border rounded min-w-[60px] text-center">
                {tab.result.page}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!tab.result?.page || !tab.result?.totalPages || tab.result.page >= tab.result.totalPages}
                onClick={() => tab.result?.page && handlePageChange(tab.result.page + 1)}
                className="px-2"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!tab.result?.page || !tab.result?.totalPages || tab.result.page >= tab.result.totalPages}
                onClick={() => tab.result?.totalPages && handlePageChange(tab.result.totalPages)}
                className="px-2"
                title="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1 p-4 overflow-auto">
        {renderResultContent()}
      </div>

      {/* Custom Popups */}
      {showPopup.type === 'success' && (
        <SuccessPopup
          title={showPopup.title}
          description={showPopup.description}
          onClose={closePopup}
        />
      )}
      {showPopup.type === 'error' && (
        <ErrorPopup
          title={showPopup.title}
          description={showPopup.description}
          onClose={closePopup}
        />
      )}
      {showPopup.type === 'info' && (
        <InfoPopup
          title={showPopup.title}
          description={showPopup.description}
          onClose={closePopup}
        />
      )}
    </div>
  );
}
