import { useMutation } from '@tanstack/react-query';
import { QueryResult } from '../../../shared/schema';
import { useQueryTabsStore } from '../contexts/query-tabs-store';
import { useToast } from './use-toast';
import { apiRequest } from '../lib/queryClient';

interface UseQueryExecutionProps {
  tabId: string;
  connectionId: number;
}

interface QueryExecutionOptions {
  page?: number;
  pageSize?: number;
  allowMultiple?: boolean;
  confirmDangerous?: boolean;
}

export function useQueryExecution({ tabId, connectionId }: UseQueryExecutionProps) {
  const { toast } = useToast();
  const {
    setTabExecuting,
    setTabResult,
    setTabError,
    clearTabError,
    getTabById
  } = useQueryTabsStore();

  const executeQueryMutation = useMutation({
    mutationFn: async ({ 
      sql, 
      page = 1, 
      pageSize = 100, 
      allowMultiple = false, 
      confirmDangerous = false 
    }: { 
      sql: string; 
    } & QueryExecutionOptions) => {
      const response = await apiRequest("POST", `/api/connections/${connectionId}/query`, { 
        sql, 
        page, 
        pageSize,
        allowMultiple,
        confirmDangerous
      });
      return response.json();
    },
    onMutate: () => {
      clearTabError(tabId);
      setTabExecuting(tabId, true);
    },
    onSuccess: (result: QueryResult, variables) => {
      setTabResult(tabId, result, variables.sql);
      
      // Show appropriate success message based on query type
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
          variant: "warning",
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
      setTabError(tabId, errorMessage);
      
      toast({
        variant: "destructive",
        title: "Query execution failed",
        description: errorMessage,
      });
    },
    onSettled: () => {
      setTabExecuting(tabId, false);
    },
  });

  const executeQuery = (sql: string, options?: QueryExecutionOptions) => {
    if (!sql.trim()) {
      toast({
        variant: "destructive",
        title: "No query to execute",
        description: "Please enter a SQL query first.",
      });
      return;
    }

    executeQueryMutation.mutate({
      sql,
      page: options?.page || 1,
      pageSize: options?.pageSize || 100,
      allowMultiple: options?.allowMultiple || false,
      confirmDangerous: options?.confirmDangerous || false,
    });
  };

  return {
    executeQuery,
    isExecuting: executeQueryMutation.isPending,
    error: executeQueryMutation.error,
  };
}

export default useQueryExecution;
