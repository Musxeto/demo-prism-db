import { Connection, DatabaseSchema, QueryResult } from "@shared/schema";

export const mockConnections: Connection[] = [
  {
    id: 1,
    name: "Production MySQL - customers.acme.com",
    host: "customers.acme.com",
    port: 3306,
    database: "ecommerce",
    username: "admin",
    password: "encrypted_password",
    isActive: true,
    createdAt: new Date("2023-01-15"),
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
    createdAt: new Date("2023-02-20"),
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
    createdAt: new Date("2023-03-10"),
  },
];

export const mockSchema: DatabaseSchema = {
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
  ],
};

export const mockQueryResult: QueryResult = {
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
  executionTime: 247,
  rowCount: 127,
};
