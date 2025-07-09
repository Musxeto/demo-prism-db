import { Connection } from "../../../shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { logAction } from "../lib/api";

interface ConnectionSelectorProps {
  connections: Connection[];
  selectedConnectionId: number | null;
  onConnectionChange: (connectionId: number) => void;
  activeTabId: string | null;
}

export default function ConnectionSelector({
  connections,
  selectedConnectionId,
  onConnectionChange,
  activeTabId,
}: ConnectionSelectorProps) {
  const selectedConnection = selectedConnectionId 
    ? connections.find(conn => conn.id === selectedConnectionId)
    : null;

  const handleConnectionChange = (value: string) => {
    const newConnectionId = parseInt(value);
    if (selectedConnectionId !== newConnectionId) {
      logAction('change_connection', { 
        tabId: activeTabId, 
        fromConnectionId: selectedConnectionId, 
        toConnectionId: newConnectionId 
      });
      onConnectionChange(newConnectionId);
    }
  };

  return (
    <div className="p-4 border-b border-slate-200">
      <Select
        value={selectedConnectionId?.toString() || ""}
        onValueChange={handleConnectionChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a connection" />
        </SelectTrigger>
        <SelectContent>
          {connections.map((connection) => (
            <SelectItem key={connection.id} value={connection.id.toString()}>
              {connection.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedConnection && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            Connected to {selectedConnection.name}
          </span>
          <span>
            {selectedConnection.host}:{selectedConnection.port}
          </span>
        </div>
      )}
    </div>
  );
}
