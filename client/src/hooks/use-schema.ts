import { create } from "zustand";
import { DatabaseSchemaResponse, ConnectionTest } from "../../../shared/schema";
import { testAndLoadConnection } from "../lib/api";

interface SchemaState {
  schema: DatabaseSchemaResponse | null;
  isLoading: boolean;
  error: string | null;
  testAndLoad: (connection: ConnectionTest) => Promise<void>;
}

export const useSchemaStore = create<SchemaState>((set) => ({
  schema: null,
  isLoading: false,
  error: null,
  testAndLoad: async (connection) => {
    set({ isLoading: true, error: null });
    try {
      const schema = await testAndLoadConnection(connection);
      set({ schema, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
