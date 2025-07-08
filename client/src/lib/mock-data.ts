import { Connection, DatabaseSchema, QueryResult } from "@shared/schema";

// Clean slate - no mock data
export const mockConnections: Connection[] = [];

export const mockSchema: DatabaseSchema = {
  name: "",
  tables: [],
};

export const mockQueryResult: QueryResult = {
  columns: [],
  rows: [],
  executionTime: 0,
  rowCount: 0,
};
