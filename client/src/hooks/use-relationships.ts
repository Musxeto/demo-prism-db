import { useQuery } from "@tanstack/react-query";
import { DatabaseRelationships } from '../../../shared/schema';

export function useRelationships(connectionId: number) {
  return useQuery<DatabaseRelationships>({
    queryKey: ["/api/connections", connectionId, "relationships"],
    queryFn: async () => {
      const response = await fetch(`/api/connections/${connectionId}/relationships`);
      if (!response.ok) {
        throw new Error("Failed to fetch relationships");
      }
      return response.json();
    },
    enabled: !!connectionId,
  });
}
