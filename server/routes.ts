import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConnectionSchema, insertQuerySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Connection routes
  app.get("/api/connections", async (req, res) => {
    try {
      const connections = await storage.getConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  app.get("/api/connections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const connection = await storage.getConnection(id);
      if (!connection) {
        return res.status(404).json({ message: "Connection not found" });
      }
      res.json(connection);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch connection" });
    }
  });

  app.post("/api/connections", async (req, res) => {
    try {
      const validatedData = insertConnectionSchema.parse(req.body);
      const connection = await storage.createConnection(validatedData);
      res.status(201).json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid connection data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create connection" });
    }
  });

  app.put("/api/connections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertConnectionSchema.partial().parse(req.body);
      const connection = await storage.updateConnection(id, validatedData);
      res.json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid connection data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update connection" });
    }
  });

  app.delete("/api/connections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteConnection(id);
      if (!deleted) {
        return res.status(404).json({ message: "Connection not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete connection" });
    }
  });

  // Schema routes
  app.get("/api/connections/:id/schema", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const schema = await storage.getSchema(id);
      res.json(schema);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schema" });
    }
  });

  // Query execution routes
  app.post("/api/connections/:id/query", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { sql } = req.body;
      
      if (!sql || typeof sql !== 'string') {
        return res.status(400).json({ message: "SQL query is required" });
      }

      const result = await storage.executeQuery(id, sql);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Query execution failed" });
    }
  });

  // Query management routes
  app.get("/api/queries", async (req, res) => {
    try {
      const queries = await storage.getQueries();
      res.json(queries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queries" });
    }
  });

  app.post("/api/queries", async (req, res) => {
    try {
      const validatedData = insertQuerySchema.parse(req.body);
      const query = await storage.createQuery(validatedData);
      res.status(201).json(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create query" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
