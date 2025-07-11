import { useQuery } from "@tanstack/react-query";
import { Connection } from "../../../shared/schema";

export function useConnection(connectionId: number | null) {
  return useQuery<Connection | undefined>({
    queryKey: ['/api/connections', connectionId],
    queryFn: async () => {
      if (!connectionId) return undefined;
      
      const response = await fetch('/api/connections');
      if (!response.ok) throw new Error('Failed to fetch connections');
      const connections = await response.json();
      return connections.find((conn: Connection) => conn.id === connectionId);
    },
    enabled: !!connectionId,
  });
}

export function useConnections() {
  return useQuery<Connection[]>({
    queryKey: ['/api/connections'],
    queryFn: async () => {
      const response = await fetch('/api/connections');
      if (!response.ok) throw new Error('Failed to fetch connections');
      return response.json();
    },
  });
}
