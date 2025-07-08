import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryResult } from "@shared/schema";
import { CheckCircle, Download, Copy, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

interface PaginationState {
  sql: string;
  page: number;
  pageSize: number;
}

interface ResultsPanelProps {
  connectionId: number;
  paginationState: PaginationState | null;
  onPaginationChange: (state: PaginationState) => void;
}

export default function ResultsPanel({ connectionId, paginationState, onPaginationChange }: ResultsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jumpToPage, setJumpToPage] = useState<string>('');
  
  const { data: result } = useQuery<QueryResult>({
    queryKey: ["query-result", connectionId],
    enabled: false, // Only fetch when manually triggered
  });

  // Pagination mutation for navigating pages
  const paginationMutation = useMutation({
    mutationFn: async ({ sql, page, pageSize }: { sql: string; page: number; pageSize: number }) => {
      const response = await apiRequest("POST", `/api/connections/${connectionId}/query`, { 
        sql, 
        page, 
        pageSize 
      });
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

  const handlePageChange = (newPage: number) => {
    if (!paginationState || !result) return;
    
    const newState = { ...paginationState, page: newPage };
    onPaginationChange(newState);
    
    paginationMutation.mutate({
      sql: paginationState.sql,
      page: newPage,
      pageSize: paginationState.pageSize,
    });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (!paginationState) return;
    
    const newState = { ...paginationState, page: 1, pageSize: newPageSize };
    onPaginationChange(newState);
    
    paginationMutation.mutate({
      sql: paginationState.sql,
      page: 1,
      pageSize: newPageSize,
    });
  };

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (!result || !pageNum || pageNum < 1 || pageNum > (result.totalPages || 1)) {
      toast({
        title: "Invalid page number",
        description: `Please enter a number between 1 and ${result?.totalPages || 1}`,
        variant: "destructive",
      });
      return;
    }
    handlePageChange(pageNum);
    setJumpToPage('');
  };

  const renderPaginationControls = () => {
    if (!result || !result.totalPages || result.totalPages <= 1) return null;

    const currentPage = result.page || 1;
    const totalPages = result.totalPages;
    
    return (
      <div className="flex items-center justify-between w-full">
        {/* Left side: Page navigation buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1 || paginationMutation.isPending}
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || paginationMutation.isPending}
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {/* Page numbers - show first few, current range, and last */}
          <div className="flex items-center space-x-1">
            {/* Show first page if we're not near the beginning */}
            {currentPage > 3 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={paginationMutation.isPending}
                  className="w-10"
                >
                  1
                </Button>
                {currentPage > 4 && <span className="text-slate-400">...</span>}
              </>
            )}
            
            {/* Show current page range */}
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
              
              // Skip if this would duplicate the first page
              if (pageNum === 1 && currentPage > 3) return null;
              // Skip if this would duplicate the last page
              if (pageNum === totalPages && currentPage < totalPages - 2) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  disabled={paginationMutation.isPending}
                  className="w-10"
                >
                  {pageNum}
                </Button>
              );
            })}
            
            {/* Show last page if we're not near the end */}
            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && <span className="text-slate-400">...</span>}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={paginationMutation.isPending}
                  className="w-10"
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || paginationMutation.isPending}
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || paginationMutation.isPending}
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Center: Page info */}
        <div className="flex items-center space-x-4">
          <div className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </div>
          
          {/* Jump to page */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-500">Go to:</span>
            <Input
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()}
              placeholder="Page"
              className="w-16 h-8 text-xs text-center"
              type="number"
              min="1"
              max={totalPages}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleJumpToPage}
              disabled={paginationMutation.isPending || !jumpToPage}
              className="h-8 px-3"
            >
              Go
            </Button>
          </div>
        </div>

        {/* Right side: Page size selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-500">Rows per page:</span>
          <Select 
            value={paginationState?.pageSize?.toString() || "100"} 
            onValueChange={(value) => handlePageSizeChange(parseInt(value))}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="250">250</SelectItem>
              <SelectItem value="500">500</SelectItem>
              <SelectItem value="1000">1000</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
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
    a.download = 'query-results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "CSV exported",
      description: "Query results exported to CSV file",
    });
  };

  const handleCopyToClipboard = async () => {
    if (!result || !result.columns || !result.rows) return;

    try {
      const headers = result.columns.map(col => col.name).join('\t');
      const rows = result.rows.map(row => 
        row.map(cell => cell === null || cell === undefined ? '' : String(cell)).join('\t')
      ).join('\n');
      const text = `${headers}\n${rows}`;
      
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Query results copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {result ? (
        <>
          {/* Results Header with Pagination Controls */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-slate-600">
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                {result.rowCount !== undefined ? (
                  <div className="flex items-center space-x-2">
                    <span>Showing {result.rowCount} rows</span>
                    {result.totalRows && result.totalRows > result.rowCount && (
                      <>
                        <span>of {result.totalRows} total</span>
                        {result.page && result.totalPages && (
                          <Badge variant="outline" className="ml-2">
                            Page {result.page} of {result.totalPages}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <span>{result.message}</span>
                )}
                {result.executionTimeMs && (
                  <Badge variant="secondary" className="ml-2">
                    {result.executionTimeMs}ms
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Export Actions */}
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportCsv}
                  disabled={!result.rows || result.rows.length === 0}
                >
                  <Download className="w-4 h-4 mr-1" />
                  CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyToClipboard}
                  disabled={!result.rows || result.rows.length === 0}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
          </div>

          {/* Pagination Controls - Full Width */}
          {result.totalPages && result.totalPages > 1 && (
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              {renderPaginationControls()}
            </div>
          )}
          
          {/* Results Table */}
          <div className="flex-1 overflow-hidden">
            {result.columns && result.rows ? (
              <DataTable 
                columns={result.columns} 
                rows={result.rows} 
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
            )}
          </div>

          {/* Bottom Pagination Info */}
          {result.totalRows && result.totalPages && result.totalPages > 1 && (
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
              <div className="text-sm text-slate-500">
                Showing <span className="font-medium">{((result.page || 1) - 1) * (result.pageSize || 100) + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min((result.page || 1) * (result.pageSize || 100), result.totalRows)}
                </span> of{" "}
                <span className="font-medium">{result.totalRows.toLocaleString()}</span> results
                <span className="ml-2">
                  (Page {result.page} of {result.totalPages})
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-slate-500">
          <div className="text-center">
            <div className="text-lg mb-2">No query results</div>
            <div className="text-sm">Execute a query to see results here</div>
          </div>
        </div>
      )}
    </div>
  );
}
