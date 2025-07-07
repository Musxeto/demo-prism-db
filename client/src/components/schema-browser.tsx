import { useQuery } from "@tanstack/react-query";
import { DatabaseSchema } from "@shared/schema";
import { ChevronRight, Database, Table, RefreshCw, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface SchemaBrowserProps {
  connectionId: number;
}

export default function SchemaBrowser({ connectionId }: SchemaBrowserProps) {
  const [openTables, setOpenTables] = useState<Set<string>>(new Set(["users"]));

  const { data: schema, isLoading, refetch } = useQuery<DatabaseSchema>({
    queryKey: ["/api/connections", connectionId, "schema"],
    queryFn: async () => {
      const response = await fetch(`/api/connections/${connectionId}/schema`);
      if (!response.ok) throw new Error("Failed to fetch schema");
      return response.json();
    },
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

  const getColumnIcon = (column: any) => {
    if (column.isPrimaryKey) {
      return <div className="w-3 h-3 mr-2 rounded bg-blue-500"></div>;
    }
    if (column.type.includes("INT") || column.type.includes("DECIMAL")) {
      return <div className="w-3 h-3 mr-2 rounded bg-green-500"></div>;
    }
    if (column.type.includes("TIMESTAMP") || column.type.includes("DATE")) {
      return <div className="w-3 h-3 mr-2 rounded bg-purple-500"></div>;
    }
    return <div className="w-3 h-3 mr-2 rounded bg-gray-400"></div>;
  };

  const formatRowCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-700">Database Schema</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-slate-500">Loading schema...</div>
        ) : schema ? (
          <div className="space-y-2">
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center w-full hover:bg-slate-50 px-2 py-1 rounded text-sm font-medium text-slate-700">
                <ChevronRight className="w-4 h-4 mr-2 transition-transform data-[state=open]:rotate-90" />
                <Database className="w-4 h-4 mr-2 text-slate-500" />
                {schema.name}
                <span className="ml-auto text-xs text-slate-400">
                  {schema.tables.length} tables
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-8 mt-1 space-y-1">
                {schema.tables.map((table) => (
                  <Collapsible
                    key={table.name}
                    open={openTables.has(table.name)}
                    onOpenChange={() => toggleTable(table.name)}
                  >
                    <CollapsibleTrigger className="flex items-center w-full hover:bg-slate-50 px-2 py-1 rounded text-sm text-slate-600">
                      <ChevronRight className="w-3 h-3 mr-2 transition-transform data-[state=open]:rotate-90" />
                      <Table className="w-4 h-4 mr-2 text-amber-500" />
                      {table.name}
                      <span className="ml-auto text-xs text-slate-400">
                        {formatRowCount(table.rowCount)}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-6 mt-1 space-y-1">
                      {table.columns.map((column) => (
                        <div
                          key={column.name}
                          className="flex items-center px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          {getColumnIcon(column)}
                          <span className="font-medium">{column.name}</span>
                          <span className="ml-2 text-slate-400">{column.type}</span>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          <div className="text-sm text-slate-500">No schema available</div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 mt-auto">
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start text-sm text-slate-600">
            <Settings className="w-4 h-4 mr-3" />
            Connection Settings
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm text-slate-600">
            <BarChart3 className="w-4 h-4 mr-3" />
            View Query History
          </Button>
        </div>
      </div>
    </div>
  );
}
