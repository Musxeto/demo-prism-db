import React, { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Search, Clock, CheckCircle, XCircle, Filter, Database } from 'lucide-react';

interface QueryLog {
  id: number;
  connection_id: number;
  tab_id: string;
  query: string;
  query_type: string;
  success: boolean;
  error_message: string | null;
  execution_time_ms: number;
  created_at: string;
}

interface QueryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuerySelect: (query: string) => void;
}

export const QueryHistoryModal: React.FC<QueryHistoryModalProps> = ({ isOpen, onClose, onQuerySelect }) => {
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [filter, setFilter] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(`http://localhost:5000/api/logs/queries`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Network response was not ok');
          }
          return res.json();
        })
        .then(data => Array.isArray(data) ? setLogs(data) : setLogs([]))
        .catch(() => setLogs([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const filteredLogs = Array.isArray(logs) ? logs.filter(log =>
    (!type || log.query_type === type) &&
    (!filter || log.query.toLowerCase().includes(filter.toLowerCase()))
  ) : [];

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getQueryTypeColor = (queryType: string) => {
    switch (queryType.toUpperCase()) {
      case 'SELECT': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'INSERT': return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
      case 'DDL': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent className="max-w-6xl w-full h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 border-b bg-white px-6 py-4">
          <AlertDialogHeader className="space-y-0">
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <Clock className="h-5 w-5 text-blue-600" />
              Query History
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600 mt-1">
              Browse and reuse your previously executed queries. Click any row to load the query into your editor.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Search and Filter Controls - Fixed */}
        <div className="flex-shrink-0 bg-gray-50 border-b px-6 py-4">
          <div className="flex gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400"
                placeholder="Search queries by content..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            
            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select 
                className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white min-w-32"
                value={type} 
                onChange={e => setType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="SELECT">SELECT</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="DDL">DDL</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary - Fixed */}
        <div className="flex-shrink-0 px-6 py-2 bg-gray-50 border-b">
          <p className="text-sm text-gray-600">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                Loading query history...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                {filteredLogs.length} {filteredLogs.length === 1 ? 'query' : 'queries'} found
                {filter && ` matching "${filter}"`}
                {type && ` of type ${type}`}
              </span>
            )}
          </p>
        </div>

        {/* Table Container - Scrollable */}
        <div className="flex-1 overflow-hidden bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your query history...</p>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No queries found</h3>
                <p className="text-gray-500">
                  {filter || type ? 
                    'Try adjusting your search criteria or clear the filters.' :
                    'Start executing queries and they will appear here for easy reuse.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Query
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Execution Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map(log => (
                    <tr
                      key={log.id}
                      className="hover:bg-blue-50 cursor-pointer transition-colors group"
                      onClick={() => {
                        onQuerySelect(log.query);
                        onClose();
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {new Date(log.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-md">
                          <p className="font-mono text-sm bg-gray-50 group-hover:bg-white px-3 py-2 rounded border transition-colors">
                            {log.query.length > 80 ? `${log.query.substring(0, 80)}...` : log.query}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getQueryTypeColor(log.query_type)}`}>
                          {log.query_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {log.success ? (
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">Success</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1" title={log.error_message || 'Unknown error'}>
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium text-red-700">Failed</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600 font-mono">
                        {formatExecutionTime(log.execution_time_ms)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 border-t bg-gray-50 px-6 py-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Tip: Click any query to load it into your editor
            </p>
            <Button variant="outline" onClick={onClose} className="min-w-20">
              Close
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
