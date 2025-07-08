import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryResult } from "@shared/schema";
import { CheckCircle, Download, Copy, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ResultsPanelWithPaginationProps {
  connectionId: number;
}

export default function ResultsPanelWithPagination({ connectionId }: ResultsPanelWithPaginationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastExecutedQuery, setLastExecutedQuery] = useState<{
    sql: string;
    pageSize: number;
  } | null>(null);
  
  const { data: result } = useQuery<QueryResult>({
    queryKey: ["query-result", connectionId],
    enabled: false, // Only fetch when manually triggered
  });

  // Pagination mutation for navigating pages
  const paginationMutation = useMutation({
    mutationFn: async ({ sql, page, pageSize }: { sql: string; page: number; pageSize: number }) => {
      const response = await fetch(`/api/connections/${connectionId}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sql, 
          page, 
          pageSize 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute query');
      }
      
      return response.json();
    },
    onSuccess: (newResult: QueryResult) => {
      queryClient.setQueryData(["query-result", connectionId], newResult);
      toast({
        title: "Page loaded",
        description: `Page ${newResult.page} of ${newResult.totalPages} loaded`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to load page",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Store the last query for pagination when a new result comes in
  useState(() => {
    if (result?.rows && result?.page && result?.pageSize) {
      // We need to get the SQL from somewhere - for now using a placeholder
      // In a real implementation, this would be passed from the query editor
      const queryData = queryClient.getQueryData(["last-query", connectionId]) as any;
      if (queryData?.sql) {
        setLastExecutedQuery({ sql: queryData.sql, pageSize: result.pageSize });
      }
    }
  });

  const handlePageChange = (newPage: number) => {
    if (!lastExecutedQuery || !result) return;
    
    paginationMutation.mutate({
      sql: lastExecutedQuery.sql,
      page: newPage,
      pageSize: lastExecutedQuery.pageSize,
    });
  };

  const handleExportCsv = () => {
    if (!result || !result.columns || !result.rows) return;

    const headers = result.columns.map(col => col.name).join(',');
    const rows = result.rows.map(row => 
      row.map(cell => {
        // Handle null values and escape commas/quotes
        if (cell === null || cell === undefined) return '';
        const str = String(cell);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    ).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export successful",
      description: "Query results exported to CSV",
    });
  };

  const handleCopyResults = async () => {
    if (!result || !result.columns || !result.rows) return;

    const headers = result.columns.map(col => col.name).join('\t');
    const rows = result.rows.map(row => 
      row.map(cell => cell === null || cell === undefined ? '' : String(cell)).join('\t')
    ).join('\n');
    const text = `${headers}\n${rows}`;
    
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Query results copied as tab-separated values",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const renderPaginationControls = () => {
    if (!result || !result.totalPages || result.totalPages <= 1) return null;

    const currentPage = result.page || 1;
    const totalPages = result.totalPages;
    
    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1 || paginationMutation.isPending}
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || paginationMutation.isPending}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        {/* Page numbers */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }
          
          return (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(pageNum)}
              disabled={paginationMutation.isPending}
            >
              {pageNum}
            </Button>
          );
        })}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || paginationMutation.isPending}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages || paginationMutation.isPending}
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const getUserSegmentBadge = (segment: string) => {
    const variants = {
      "Power User": "bg-purple-100 text-purple-800",
      "Regular User": "bg-blue-100 text-blue-800",
      "Light User": "bg-yellow-100 text-yellow-800",
      "No Orders": "bg-gray-100 text-gray-800",
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[segment as keyof typeof variants] || "bg-gray-100 text-gray-800"}`}>
        {segment}
      </span>
    );
  };

  return (
    <div className="bg-white border-t border-slate-200 h-96 flex flex-col">
      {/* Results Header */}
      <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center space-x-6">
          <h3 className="text-sm font-medium text-slate-700">Query Results</h3>
          {result && (
            <div className="flex items-center space-x-4 text-sm text-slate-500">
              <span className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                Executed successfully
              </span>
              <span>{result.executionTimeMs}ms</span>
              {result.rowCount !== undefined && (
                <span>{result.rowCount} rows returned</span>
              )}
              {result.message && (
                <span>{result.message}</span>
              )}
              <span>Last run: {new Date().toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        {result && result.columns && result.rows && (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyResults}>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
        )}
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-auto">
        {result ? (
          result.columns && result.rows ? (
            <DataTable
              columns={result.columns}
              rows={result.rows}
              renderCell={(value, column, rowIndex) => {
                if (column.name === "user_segment") {
                  return getUserSegmentBadge(value);
                }
                if (column.name === "total_spent" && typeof value === "number") {
                  return <span className="text-green-600 font-medium">${value.toFixed(2)}</span>;
                }
                if (column.name === "id" || column.name === "total_orders") {
                  return <span className="text-slate-900">{value}</span>;
                }
                if (column.name === "username") {
                  return <span className="text-slate-900 font-medium">{value}</span>;
                }
                // Handle null values
                if (value === null || value === undefined) {
                  return <span className="text-slate-400 italic">NULL</span>;
                }
                return <span className="text-slate-600">{String(value)}</span>;
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-slate-600">{result.message || "Query executed successfully"}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Executed in {result.executionTimeMs}ms
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <div className="text-sm">No query results to display</div>
              <div className="text-xs mt-1">Execute a query to see results here</div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {result && result.rows && (
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="text-sm text-slate-500">
            {result.totalRows ? (
              <>
                Showing <span className="font-medium">{((result.page || 1) - 1) * (result.pageSize || 100) + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min((result.page || 1) * (result.pageSize || 100), result.totalRows)}
                </span> of{" "}
                <span className="font-medium">{result.totalRows.toLocaleString()}</span> results
                {result.totalPages && (
                  <span className="ml-2">
                    (Page {result.page} of {result.totalPages})
                  </span>
                )}
              </>
            ) : (
              <>
                Showing <span className="font-medium">1</span> to{" "}
                <span className="font-medium">{result.rows.length}</span> of{" "}
                <span className="font-medium">{result.rowCount || result.rows.length}</span> results
              </>
            )}
          </div>
          {renderPaginationControls()}
        </div>
      )}
    </div>
  );
}
