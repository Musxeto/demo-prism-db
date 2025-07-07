import { useQuery } from "@tanstack/react-query";
import { QueryResult } from "@shared/schema";
import { CheckCircle, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";

interface ResultsPanelProps {
  connectionId: number;
}

export default function ResultsPanel({ connectionId }: ResultsPanelProps) {
  const { toast } = useToast();
  
  const { data: result } = useQuery<QueryResult>({
    queryKey: ["query-result", connectionId],
    enabled: false, // Only fetch when manually triggered
  });

  const handleExportCsv = () => {
    if (!result) return;

    const headers = result.columns.map(col => col.name).join(',');
    const rows = result.rows.map(row => row.join(',')).join('\n');
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
    if (!result) return;

    const headers = result.columns.map(col => col.name).join('\t');
    const rows = result.rows.map(row => row.join('\t')).join('\n');
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
    <div className="bg-white border-t border-slate-200 h-96">
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
              <span>{result.executionTime}ms</span>
              <span>{result.rowCount} rows returned</span>
              <span>Last run: {new Date().toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        {result && (
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
              return <span className="text-slate-600">{value}</span>;
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            Execute a query to see results here
          </div>
        )}
      </div>

      {/* Pagination */}
      {result && (
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium">1</span> to{" "}
            <span className="font-medium">{result.rows.length}</span> of{" "}
            <span className="font-medium">{result.rowCount}</span> results
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="default" size="sm">
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              3
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
