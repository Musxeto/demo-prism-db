import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Connection, InsertConnection } from "../../../shared/schema";

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

export function useUpdateConnection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ connectionId, updates }: { connectionId: number; updates: Partial<InsertConnection> }) => {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update connection');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (connectionId: number) => {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete connection');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
    },
  });
}
