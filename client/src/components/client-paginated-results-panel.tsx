import React, { useState, useMemo } from 'react';
import { QueryResult } from '../../../shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertTriangle, Clock, Database, FileText, Zap, Copy, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { PaginationControls } from './pagination-controls';
import { useToast } from '../hooks/use-toast';

interface ClientPaginatedResultsPanelProps {
  result: QueryResult;
  onExport?: () => void;
}

export function ClientPaginatedResultsPanel({ 
  result, 
  onExport 
}: ClientPaginatedResultsPanelProps) {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Paginate data client-side
  const paginatedData = useMemo(() => {
    if (!result.rows || result.rows.length === 0) {
      return {
        data: [],
        totalPages: 0,
        totalRows: 0,
        startIndex: 0,
        endIndex: 0
      };
    }

    const totalRows = result.rows.length;
    const totalPages = Math.ceil(totalRows / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRows);
    const data = result.rows.slice(startIndex, endIndex);

    return {
      data,
      totalPages,
      totalRows,
      startIndex,
      endIndex
    };
  }, [result.rows, currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table when page changes
    const tableContainer = document.querySelector('[data-pagination-table]');
    if (tableContainer) {
      tableContainer.scrollTop = 0;
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const copyData = () => {
    if (!result.rows || !result.columns) return;
    
    const headers = result.columns.map(col => col.name).join('\t');
    const rows = paginatedData.data.map(row => 
      row.map(cell => cell === null ? 'NULL' : String(cell)).join('\t')
    ).join('\n');
    
    const text = `${headers}\n${rows}`;
    navigator.clipboard.writeText(text);
    
    toast({
      title: "Data copied",
      description: `${paginatedData.data.length} rows copied to clipboard`,
    });
  };

  const getResultIcon = () => {
    switch (result.type) {
      case 'select':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'write':
        return <Zap className="h-4 w-4 text-green-500" />;
      case 'ddl':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'multi':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getResultTitle = () => {
    switch (result.type) {
      case 'select':
        return 'Query Results';
      case 'write':
        return 'Data Modification Results';
      case 'ddl':
        return 'DDL Operation Results';
      case 'multi':
        return 'Multi-Statement Results';
      case 'error':
        return 'Query Error';
      default:
        return 'Query Results';
    }
  };

  const getResultBadgeVariant = () => {
    switch (result.type) {
      case 'select':
        return 'default';
      case 'write':
        return 'default';
      case 'ddl':
        return 'secondary';
      case 'multi':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const renderErrorResult = () => (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {result.message || 'An error occurred while executing the query.'}
        </AlertDescription>
      </Alert>
      {result.warnings && result.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {result.warnings.map((warning, index) => (
                <div key={index}>• {warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderWriteResult = () => (
    <div className="space-y-4">
      <Alert>
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertDescription>
          {result.message || 'Operation completed successfully.'}
        </AlertDescription>
      </Alert>
      
      {result.affectedRows !== undefined && (
        <div className="p-4 bg-muted rounded-lg">
          <div className="text-sm font-medium">
            Rows affected: <span className="text-green-600">{result.affectedRows}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderDDLResult = () => (
    <div className="space-y-4">
      <Alert>
        <FileText className="h-4 w-4 text-purple-500" />
        <AlertDescription>
          {result.message || 'DDL operation completed successfully.'}
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderSelectResult = () => {
    if (!result.columns || !result.rows || result.rows.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-muted-foreground">No results found</div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Results header with title and actions */}
        <div className="flex items-center justify-between p-4 bg-muted/30 border rounded-lg mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Query Results</span>
              <Badge variant="outline">{result.type?.toUpperCase()}</Badge>
            </div>
            {result.isDangerous && (
              <Badge variant="destructive" className="text-xs">
                ⚠️ Dangerous Operation
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatExecutionTime(result.executionTimeMs)}
            </div>
            <Button variant="outline" size="sm" onClick={copyData}>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Data table with pagination */}
        <div className="flex-1 flex flex-col border rounded-lg bg-white shadow-sm overflow-hidden">
          {/* Table container */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" data-pagination-table>
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    {result.columns.map((column, index) => (
                      <TableHead key={index} className="border-r last:border-r-0">
                        <div className="space-y-1 min-w-[120px]">
                          <div className="font-semibold text-gray-900">{column.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {column.type}
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.data.map((row, rowIndex) => (
                    <TableRow key={rowIndex} className="hover:bg-muted/50">
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="border-r last:border-r-0 font-mono text-sm">
                          <div className="max-w-[200px] truncate" title={String(cell || '')}>
                            {cell === null ? (
                              <span className="text-muted-foreground italic">NULL</span>
                            ) : cell === '' ? (
                              <span className="text-muted-foreground italic">''</span>
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

          {/* Pagination controls - fixed at bottom */}
          {paginatedData.totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={paginatedData.totalPages}
              totalRows={paginatedData.totalRows}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      </div>
    );
  };

  const renderMultiResult = () => {
    if (!result.results) {
      return renderWriteResult();
    }

    return (
      <div className="space-y-4">
        <Alert>
          <FileText className="h-4 w-4 text-orange-500" />
          <AlertDescription>
            {result.message || 'Multi-statement query executed successfully.'}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {result.results.map((subResult, index) => (
            <Card key={index} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Statement {index + 1}
                    {subResult.queryType && (
                      <Badge variant="outline" className="ml-2">
                        {subResult.queryType.toUpperCase()}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatExecutionTime(subResult.executionTimeMs)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ClientPaginatedResultsPanel result={subResult} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Warnings */}
        {result.warnings && result.warnings.length > 0 && (
          <Alert className="mb-4 flex-shrink-0">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {result.warnings.map((warning, index) => (
                  <div key={index}>• {warning}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Result Content */}
        <div className="flex-1 min-h-0">
          {result.type === 'error' && renderErrorResult()}
          {result.type === 'select' && renderSelectResult()}
          {result.type === 'write' && renderWriteResult()}
          {result.type === 'ddl' && renderDDLResult()}
          {result.type === 'multi' && renderMultiResult()}
        </div>
      </div>
    </div>
  );
}
