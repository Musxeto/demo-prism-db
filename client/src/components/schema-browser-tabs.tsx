import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DatabaseSchema } from "../../../shared/schema";
import { useQueryTabsStore } from "../contexts/query-tabs-store";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "./ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  ChevronRight,
  Database,
  Table,
  RefreshCw,
  Key,
  Link,
  FileText,
  Eye,
  MoreHorizontal,
  Plus,
  Copy,
  Settings,
  History // Changed from BarChart3
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { cn } from "../lib/utils";

// Helper function to get table name regardless of property name
const getTableName = (table: any): string => {
  return table.name || table.tableName || 'unknown';
};

interface SchemaBrowserWithTabsProps {
  connectionId: number;
  className?: string;
  onViewHistoryClick: () => void;
}

export function SchemaBrowserWithTabs({ connectionId, className, onViewHistoryClick }: SchemaBrowserWithTabsProps) {
  const { toast } = useToast();
  const { addTab } = useQueryTabsStore();
  const [openTables, setOpenTables] = useState<Set<string>>(new Set());

  // Fetch connection details to check database type
  const { data: connection } = useQuery({
    queryKey: ["connection", connectionId],
    queryFn: async () => {
      const response = await fetch(`/api/connections/${connectionId}`);
      if (!response.ok) throw new Error("Failed to fetch connection");
      return response.json();
    },
    enabled: !!connectionId,
  });

  const { data: schema, isLoading, refetch, error } = useQuery<DatabaseSchema>({
    queryKey: ["schema", connectionId],
    queryFn: async () => {
      const response = await fetch(`/api/connections/${connectionId}/schema`);
      if (!response.ok) throw new Error("Failed to fetch schema");
      return response.json();
    },
    enabled: !!connectionId,
  });

  const toggleTable = (tableName: string) => {
    setOpenTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableName)) {
        newSet.delete(tableName);
      } else {
        newSet.add(tableName);
      }
      return newSet;
    });
  };

  const handleNewQueryTab = () => {
    addTab(connectionId);
    toast({
      title: "New query tab created",
      description: "A blank query tab has been opened",
    });
  };

  const handleSelectFromTable = (tableName: string) => {
    // Debug: Log the connection object to see its structure
    console.log("Connection object:", connection);
    console.log("Connection databaseType:", connection?.databaseType);
    console.log("Connection database_type:", connection?.database_type);
    
    // Check if this is a MongoDB connection - try multiple property names
    const isMongoDB = connection?.databaseType === 'mongodb' || 
                     connection?.database_type === 'mongodb' ||
                     connection?.databaseType === 'mongo' || 
                     connection?.database_type === 'mongo';
    
    console.log("Is MongoDB:", isMongoDB);
    
    const query = isMongoDB 
      ? `db.${tableName}.find({})`  // MongoDB query
      : `SELECT * FROM ${tableName} LIMIT 100;`;  // SQL query
      
    addTab(connectionId, query, tableName);
    toast({
      title: "Query tab opened",
      description: `${isMongoDB ? 'Find' : 'SELECT'} query created for ${isMongoDB ? 'collection' : 'table'} "${tableName}"`,
    });
  };

  const handleDescribeTable = (tableName: string) => {
    // Check if this is a MongoDB connection
    const isMongoDB = connection?.databaseType === 'mongodb' || connection?.database_type === 'mongodb';
    
    const query = isMongoDB
      ? `// Collection: ${tableName}
// Get sample document structure
db.${tableName}.findOne()

// Alternative: Get collection statistics
// db.${tableName}.stats()

// Get index information
// db.${tableName}.getIndexes()`
      : `DESCRIBE ${tableName};`;
      
    addTab(connectionId, query, `Describe ${tableName}`);
    toast({
      title: "Describe query created",
      description: `${isMongoDB ? 'Collection structure' : 'Table structure'} query for "${tableName}"`,
    });
  };

  const handleShowCreateTable = (tableName: string) => {
    // Check if this is a MongoDB connection
    const isMongoDB = connection?.databaseType === 'mongodb' || connection?.database_type === 'mongodb';
    
    if (isMongoDB) {
      // For MongoDB, show collection stats and indexes
      const query = `// MongoDB Collection: ${tableName}
// Collection statistics
db.${tableName}.stats()

// Index information
db.${tableName}.getIndexes()

// Count documents
db.${tableName}.countDocuments()`;
      addTab(connectionId, query, `Info ${tableName}`);
      toast({
        title: "Collection info opened",
        description: `Information query for collection "${tableName}"`,
      });
    } else {
      const query = `SHOW CREATE TABLE ${tableName};`;
      addTab(connectionId, query, `Create ${tableName}`);
      toast({
        title: "Create table query opened",
        description: `DDL query for table "${tableName}"`,
      });
    }
  };

  const handleCopyTableName = async (tableName: string) => {
    try {
      await navigator.clipboard.writeText(tableName);
      toast({
        title: "Table name copied",
        description: `"${tableName}" copied to clipboard`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Could not copy table name to clipboard",
      });
    }
  };

  const handleTableClick = (tableName: string, event: React.MouseEvent) => {
    // Prevent triggering when clicking the chevron
    if ((event.target as HTMLElement).closest('[data-trigger="chevron"]')) {
      return;
    }

    handleSelectFromTable(tableName);
  };

  const getColumnIcon = (column: any) => {
    if (column.isPrimaryKey) {
      return <Key className="w-3 h-3 mr-2 text-blue-500" />;
    }
    if (column.isForeignKey) {
      return <Link className="w-3 h-3 mr-2 text-purple-500" />;
    }
    // MongoDB dynamic type
    if (column.type === "DYNAMIC") {
      return <div className="w-3 h-3 mr-2 rounded bg-orange-500" title="Dynamic type (MongoDB)"></div>;
    }
    if (column.type.includes("INT") || column.type.includes("DECIMAL") || column.type.includes("NUMERIC")) {
      return <div className="w-3 h-3 mr-2 rounded bg-green-500"></div>;
    }
    if (column.type.includes("TIMESTAMP") || column.type.includes("DATE") || column.type.includes("TIME")) {
      return <div className="w-3 h-3 mr-2 rounded bg-purple-500"></div>;
    }
    if (column.type.includes("VARCHAR") || column.type.includes("TEXT") || column.type.includes("CHAR")) {
      return <div className="w-3 h-3 mr-2 rounded bg-yellow-500"></div>;
    }
    return <div className="w-3 h-3 mr-2 rounded bg-gray-400"></div>;
  };

  const formatRowCount = (count: number | undefined) => {
    if (count === undefined || count === null) {
      return "0";
    }
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  React.useEffect(() => {
    if (schema) {
      console.log("Schema received:", schema);
      console.log("Tables in schema:", schema.tables);
    }
  }, [schema]);

  if (isLoading) {
    return (
      <div className={cn("flex-1 flex flex-col overflow-hidden h-full", className)}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-center h-32">
            <div className="text-center space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-slate-500" />
              <p className="text-sm text-slate-500">Loading schema...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex-1 flex flex-col overflow-hidden h-full", className)}>
        <div className="p-4 border-b border-slate-200">
          <div className="text-center space-y-2">
            <Database className="h-8 w-8 mx-auto text-slate-500" />
            <p className="text-sm text-slate-500">Failed to load schema</p>
            <Button onClick={() => refetch()} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!schema?.tables || schema.tables.length === 0) {
    return (
      <div className={cn("flex-1 flex flex-col overflow-hidden h-full", className)}>
        <div className="p-4 border-b border-slate-200">
          <div className="text-center space-y-2">
            <Database className="h-8 w-8 mx-auto text-slate-500" />
            <p className="text-sm text-slate-500">No tables found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 flex flex-col overflow-hidden h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-700">Database Schema</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewHistoryClick?.()}
              className="h-6 w-6 p-0"
              title="View Query History"
            >
              <History className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleNewQueryTab}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tables List */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2 py-2">
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center w-full hover:bg-slate-50 px-2 py-1 rounded text-sm font-medium text-slate-700">
              <ChevronRight
                className="w-4 h-4 mr-2 transition-transform data-[state=open]:rotate-90"
                data-trigger="chevron"
              />
              <Database className="w-4 h-4 mr-2 text-slate-500" />
              {schema.name || 'Database'}
              <span className="ml-auto text-xs text-slate-400">
                {schema.tables.length} {(connection?.databaseType === 'mongodb' || connection?.database_type === 'mongodb') ? 'collections' : 'tables'}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-8 mt-1 space-y-1">
              {schema.tables && schema.tables.map((table) => {
                const tableName = getTableName(table);
                const isMongoDB = connection?.databaseType === 'mongodb' || connection?.database_type === 'mongodb';
                return (
                  <Collapsible
                    key={`table-${tableName}`}
                    open={openTables.has(tableName)}
                    onOpenChange={() => toggleTable(tableName)}
                  >
                    <div className="flex items-center w-full group">
                      <CollapsibleTrigger
                        className="flex items-center flex-1 hover:bg-slate-50 px-2 py-1 rounded text-sm text-slate-600"
                        onClick={(e) => handleTableClick(tableName, e)}
                      >
                        <ChevronRight
                          className="w-3 h-3 mr-2 transition-transform data-[state=open]:rotate-90"
                          data-trigger="chevron"
                        />
                        <Table className={`w-4 h-4 mr-2 ${isMongoDB ? 'text-green-500' : 'text-amber-500'}`} />
                        <span className="font-medium group-hover:text-blue-600 cursor-pointer">
                          {tableName}
                        </span>
                        {isMongoDB && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded">
                            MongoDB
                          </span>
                        )}
                        <span className="ml-auto text-xs text-slate-400">
                          {formatRowCount(table.rowCount)}
                        </span>
                      </CollapsibleTrigger>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleSelectFromTable(tableName)}>
                            <Eye className="h-3 w-3 mr-2" />
                            {isMongoDB ? 'Find Documents' : 'Select Data'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDescribeTable(tableName)}>
                            <FileText className="h-3 w-3 mr-2" />
                            {isMongoDB ? 'Schema Info' : 'Describe Table'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShowCreateTable(tableName)}>
                            <Database className="h-3 w-3 mr-2" />
                            {isMongoDB ? 'Collection Info' : 'Show CREATE'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleCopyTableName(tableName)}>
                            <Copy className="h-3 w-3 mr-2" />
                            Copy Name
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <CollapsibleContent className="ml-6 mt-1 space-y-1">
                      {table.columns && table.columns.map((column) => (
                        <div
                          key={`${tableName}-${column.name}`}
                          className="flex items-center px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 rounded cursor-pointer"
                          title={`${column.name} (${column.type})${column.isPrimaryKey ? ' - Primary Key' : ''}${column.isForeignKey ? ' - Foreign Key' : ''}`}
                        >
                          {getColumnIcon(column)}
                          <span className={`font-medium ${column.isPrimaryKey ? 'text-blue-600' : ''}`}>
                            {column.name}
                          </span>
                          <span className="ml-2 text-slate-400">{column.type}</span>
                          {!column.nullable && (
                            <span className="ml-1 text-red-400 text-xs">*</span>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 mt-auto">
        <div className="space-y-2">
          {/* <Button variant="ghost" className="w-full justify-start text-sm text-slate-600">
            <Settings className="w-4 h-4 mr-3" />
            Connection Settings
          </Button> */}
        </div>
      </div>
    </div>
  );
}

export default SchemaBrowserWithTabs;