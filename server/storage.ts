import { connections, queries, type Connection, type InsertConnection, type Query, type InsertQuery, type DatabaseSchema, type QueryResult } from "@shared/schema";

export interface IStorage {
  // Connection management
  getConnections(): Promise<Connection[]>;
  getConnection(id: number): Promise<Connection | undefined>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnection(id: number, connection: Partial<InsertConnection>): Promise<Connection>;
  deleteConnection(id: number): Promise<boolean>;
  
  // Query management
  getQueries(): Promise<Query[]>;
  createQuery(query: InsertQuery): Promise<Query>;
  
  // Schema introspection
  getSchema(connectionId: number): Promise<DatabaseSchema>;
  
  // Query execution
  executeQuery(connectionId: number, sql: string): Promise<QueryResult>;
}

export class MemStorage implements IStorage {
  private connections: Map<number, Connection>;
  private queries: Map<number, Query>;
  private currentConnectionId: number;
  private currentQueryId: number;

  constructor() {
    this.connections = new Map();
    this.queries = new Map();
    this.currentConnectionId = 1;
    this.currentQueryId = 1;
    
    // Initialize with mock connections
    this.initializeMockData();
  }

  private initializeMockData() {
    const mockConnections: Connection[] = [
      {
        id: 1,
        name: "Production MySQL - customers.acme.com",
        host: "customers.acme.com",
        port: 3306,
        database: "ecommerce",
        username: "admin",
        password: "encrypted_password",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 2,
        name: "Staging PostgreSQL - staging.acme.com",
        host: "staging.acme.com",
        port: 5432,
        database: "staging_db",
        username: "staging_user",
        password: "encrypted_password",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 3,
        name: "Analytics MySQL - analytics.acme.com",
        host: "analytics.acme.com",
        port: 3306,
        database: "analytics",
        username: "analytics_user",
        password: "encrypted_password",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 4,
        name: "Reporting DB - reports.acme.com",
        host: "reports.acme.com",
        port: 3306,
        database: "reports",
        username: "reports_user",
        password: "encrypted_password",
        isActive: true,
        createdAt: new Date(),
      },
    ];

    mockConnections.forEach(conn => {
      this.connections.set(conn.id, conn);
    });
    this.currentConnectionId = 5;
  }

  async getConnections(): Promise<Connection[]> {
    return Array.from(this.connections.values());
  }

  async getConnection(id: number): Promise<Connection | undefined> {
    return this.connections.get(id);
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const id = this.currentConnectionId++;
    const connection: Connection = {
      ...insertConnection,
      id,
      createdAt: new Date(),
    };
    this.connections.set(id, connection);
    return connection;
  }

  async updateConnection(id: number, updateData: Partial<InsertConnection>): Promise<Connection> {
    const existing = this.connections.get(id);
    if (!existing) {
      throw new Error("Connection not found");
    }
    const updated: Connection = { ...existing, ...updateData };
    this.connections.set(id, updated);
    return updated;
  }

  async deleteConnection(id: number): Promise<boolean> {
    return this.connections.delete(id);
  }

  async getQueries(): Promise<Query[]> {
    return Array.from(this.queries.values());
  }

  async createQuery(insertQuery: InsertQuery): Promise<Query> {
    const id = this.currentQueryId++;
    const query: Query = {
      ...insertQuery,
      id,
      createdAt: new Date(),
    };
    this.queries.set(id, query);
    return query;
  }

  async getSchema(connectionId: number): Promise<DatabaseSchema> {
    // Mock schema data based on connection
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }

    // Return different mock schemas based on connection
    if (connection.database === "ecommerce") {
      return {
        name: "ecommerce",
        tables: [
          {
            name: "users",
            rowCount: 1200000,
            columns: [
              { name: "id", type: "INT PRIMARY KEY", nullable: false, isPrimaryKey: true, isForeignKey: false },
              { name: "email", type: "VARCHAR(255)", nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: "username", type: "VARCHAR(100)", nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: "created_at", type: "TIMESTAMP", nullable: false, isPrimaryKey: false, isForeignKey: false },
            ],
          },
          {
            name: "orders",
            rowCount: 5800000,
            columns: [
              { name: "id", type: "INT PRIMARY KEY", nullable: false, isPrimaryKey: true, isForeignKey: false },
              { name: "user_id", type: "INT", nullable: false, isPrimaryKey: false, isForeignKey: true },
              { name: "total_amount", type: "DECIMAL(10,2)", nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: "created_at", type: "TIMESTAMP", nullable: false, isPrimaryKey: false, isForeignKey: false },
            ],
          },
          {
            name: "products",
            rowCount: 450000,
            columns: [
              { name: "id", type: "INT PRIMARY KEY", nullable: false, isPrimaryKey: true, isForeignKey: false },
              { name: "name", type: "VARCHAR(255)", nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: "price", type: "DECIMAL(10,2)", nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: "category_id", type: "INT", nullable: false, isPrimaryKey: false, isForeignKey: true },
            ],
          },
          {
            name: "categories",
            rowCount: 120,
            columns: [
              { name: "id", type: "INT PRIMARY KEY", nullable: false, isPrimaryKey: true, isForeignKey: false },
              { name: "name", type: "VARCHAR(100)", nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: "description", type: "TEXT", nullable: true, isPrimaryKey: false, isForeignKey: false },
            ],
          },
        ],
      };
    }

    // Default schema for other connections
    return {
      name: connection.database,
      tables: [
        {
          name: "sample_table",
          rowCount: 1000,
          columns: [
            { name: "id", type: "INT PRIMARY KEY", nullable: false, isPrimaryKey: true, isForeignKey: false },
            { name: "name", type: "VARCHAR(255)", nullable: false, isPrimaryKey: false, isForeignKey: false },
            { name: "created_at", type: "TIMESTAMP", nullable: false, isPrimaryKey: false, isForeignKey: false },
          ],
        },
      ],
    };
  }

  async executeQuery(connectionId: number, sql: string): Promise<QueryResult> {
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }

    // Validate that it's a SELECT query
    const trimmedSql = sql.trim().toLowerCase();
    if (!trimmedSql.startsWith("select")) {
      throw new Error("Only SELECT queries are allowed");
    }

    // Mock query execution with sample data
    const startTime = Date.now();
    
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 50));
    
    const executionTime = Date.now() - startTime;

    // Return mock result data
    return {
      columns: [
        { name: "id", type: "INT" },
        { name: "username", type: "VARCHAR" },
        { name: "email", type: "VARCHAR" },
        { name: "created_at", type: "TIMESTAMP" },
        { name: "total_orders", type: "INT" },
        { name: "total_spent", type: "DECIMAL" },
        { name: "last_order_date", type: "TIMESTAMP" },
        { name: "user_segment", type: "VARCHAR" },
      ],
      rows: [
        [1047, "alexandra_m", "alexandra.martinez@example.com", "2023-08-15 09:24:33", 23, 4892.50, "2024-01-12 14:22:10", "Power User"],
        [2156, "james_wilson", "j.wilson@company.com", "2023-09-22 16:45:12", 18, 3204.75, "2024-01-08 11:15:42", "Regular User"],
        [3891, "sarah_chen", "sarah.chen@domain.org", "2023-07-03 13:22:55", 31, 2945.20, "2024-01-10 08:30:18", "Power User"],
        [4523, "mike_rodriguez", "mike.rodriguez@email.net", "2023-10-18 10:12:40", 12, 1856.90, "2023-12-28 19:45:33", "Regular User"],
        [5672, "emma_thompson", "emma.t@business.com", "2023-11-05 07:38:21", 8, 1234.60, "2024-01-05 15:22:45", "Regular User"],
      ],
      executionTime,
      rowCount: 127, // Total rows (simulated pagination)
    };
  }
}

export const storage = new MemStorage();
