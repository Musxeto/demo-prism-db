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

  return (
    <AlertDialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent className="max-w-3xl w-full max-h-[80vh] overflow-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Query History</AlertDialogTitle>
          <AlertDialogDescription>
            View and search your recent executed queries. Click a row to load it into the editor.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-2 mb-2">
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Search by keyword..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <select className="border rounded px-2 py-1" value={type} onChange={e => setType(e.target.value)}>
            <option value="">All Types</option>
            <option value="SELECT">SELECT</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="DDL">DDL</option>
          </select>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No queries executed yet</div>
        ) : (
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Timestamp</th>
                <th className="p-2 text-left">Query</th>
                <th className="p-2">Type</th>
                <th className="p-2">Status</th>
                <th className="p-2">Exec Time (ms)</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr
                  key={log.id}
                  className="hover:bg-blue-50 cursor-pointer"
                  onClick={() => onQuerySelect(log.query)}
                >
                  <td className="p-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="p-2 max-w-xs truncate" title={log.query}>{log.query}</td>
                  <td className="p-2 text-center">{log.query_type}</td>
                  <td className="p-2 text-center">
                    {log.success ? (
                      <span className="text-green-600">Success</span>
                    ) : (
                      <span className="text-red-600" title={log.error_message || undefined}>Failed</span>
                    )}
                  </td>
                  <td className="p-2 text-center">{log.execution_time_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
