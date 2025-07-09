import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(3306),
  database: text("database").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const queries = pgTable("queries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sql: text("sql").notNull(),
  connectionId: integer("connection_id").references(() => connections.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  createdAt: true,
});

export const insertQuerySchema = createInsertSchema(queries).omit({
  id: true,
  createdAt: true,
});

export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connections.$inferSelect;
export type InsertQuery = z.infer<typeof insertQuerySchema>;
export type Query = typeof queries.$inferSelect;

// Schema introspection types
export interface DatabaseSchema {
  name: string;
  tables: DatabaseTable[];
}

export interface DatabaseTable {
  name: string;
  rowCount: number;
  columns: DatabaseColumn[];
  primaryKeys?: string[];
  foreignKeys?: Array<{
    column: string;
    references: {
      table: string;
      column: string;
    };
  }>;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface QueryResult {
  type: string; // 'select', 'write', 'ddl', 'error', 'multi'
  queryType?: string; // 'insert', 'update', 'delete', 'create_table', etc.
  columns?: Array<{ name: string; type: string }>;
  rows?: any[][];
  rowCount?: number;
  totalRows?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  executionTimeMs: number;
  affectedRows?: number;
  message?: string;
  warnings?: string[];
  isDangerous?: boolean;
  results?: QueryResult[]; // For multi-statement results
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface TableSchema {
  tableName: string;
  rowCount: number;
  columns: ColumnSchema[];
  sampleRows: Record<string, any>[];
}

export interface RelationshipSchema {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: string;
}

export interface DatabaseSchemaResponse {
  database: string;
  tables: TableSchema[];
  relationships: RelationshipSchema[];
}

export interface DatabaseRelationships {
  database: string;
  tables: DatabaseTable[];
  relationships: Array<{
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    type: string;
  }>;
}

export interface ConnectionTest {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}
