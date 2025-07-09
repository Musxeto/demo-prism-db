import React from 'react';
import { QueryResult } from '../../../shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertTriangle, Clock, Database, FileText, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

interface EnhancedResultsPanelProps {
  result: QueryResult;
  onPageChange?: (page: number) => void;
  onExport?: () => void;
}

export function EnhancedResultsPanel({ 
  result, 
  onPageChange, 
  onExport 
}: EnhancedResultsPanelProps) {
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
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Rows affected: <strong>{result.affectedRows}</strong></span>
        </div>
      )}
    </div>
  );

  const renderDDLResult = () => (
    <div className="space-y-4">
      <Alert>
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertDescription>
          {result.message || 'DDL operation completed successfully.'}
        </AlertDescription>
      </Alert>
      
      {result.queryType && (
        <div className="text-sm text-muted-foreground">
          Operation type: <Badge variant="outline">{result.queryType.toUpperCase()}</Badge>
        </div>
      )}
    </div>
  );

  const renderSelectResult = () => {
    if (!result.columns || !result.rows) {
      return (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription>
            Query executed successfully but returned no data.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        {/* Data Table */}
        <div className="border rounded-md">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {result.columns.map((column, index) => (
                    <TableHead key={index}>
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

        {/* Pagination */}
        {result.totalPages && result.totalPages > 1 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {result.rowCount} of {result.totalRows} rows
              (Page {result.page} of {result.totalPages})
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!result.page || result.page <= 1}
                onClick={() => onPageChange?.(result.page! - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!result.page || !result.totalPages || result.page >= result.totalPages}
                onClick={() => onPageChange?.(result.page! + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
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
                <EnhancedResultsPanel result={subResult} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getResultIcon()}
            <CardTitle className="text-lg">{getResultTitle()}</CardTitle>
            <Badge variant={getResultBadgeVariant()}>
              {result.type?.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatExecutionTime(result.executionTimeMs)}
            </div>
            {onExport && result.type === 'select' && result.rows && (
              <Button variant="outline" size="sm" onClick={onExport}>
                Export
              </Button>
            )}
          </div>
        </div>
        {result.isDangerous && (
          <CardDescription className="text-red-600">
            ⚠️ This was a potentially dangerous operation
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        {/* Warnings */}
        {result.warnings && result.warnings.length > 0 && (
          <Alert className="mb-4">
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
        {result.type === 'error' && renderErrorResult()}
        {result.type === 'select' && renderSelectResult()}
        {result.type === 'write' && renderWriteResult()}
        {result.type === 'ddl' && renderDDLResult()}
        {result.type === 'multi' && renderMultiResult()}
      </CardContent>
    </Card>
  );
}
