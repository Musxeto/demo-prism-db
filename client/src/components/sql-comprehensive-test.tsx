import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { useQueryTabsStore } from '../contexts/query-tabs-store';
import { 
  Database, 
  Play, 
  AlertTriangle, 
  Plus, 
  Edit, 
  Trash2, 
  Table,
  FileText,
  Settings,
  CheckCircle
} from 'lucide-react';

interface SQLTestDemoProps {
  connectionId?: number;
}

export function SQLTestDemo({ connectionId }: SQLTestDemoProps) {
  const [customSQL, setCustomSQL] = useState('');
  const { addTab, setActiveTab } = useQueryTabsStore();

  // Comprehensive SQL Examples organized by type
  const sqlExamples = {
    setup: {
      title: "🏗️ Setup Test Data",
      description: "Create tables and sample data for testing",
      queries: [
        {
          name: "Create Test Table",
          type: "DDL",
          sql: `CREATE TABLE IF NOT EXISTS demo_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    age INT,
    department VARCHAR(50),
    salary DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
          description: "Creates a demo users table for testing"
        },
        {
          name: "Insert Sample Data",
          type: "INSERT",
          sql: `INSERT INTO demo_users (name, email, age, department, salary) VALUES 
('Alice Johnson', 'alice@company.com', 28, 'Engineering', 75000.00),
('Bob Smith', 'bob@company.com', 34, 'Marketing', 65000.00),
('Carol White', 'carol@company.com', 22, 'Design', 60000.00),
('David Brown', 'david@company.com', 41, 'Engineering', 95000.00),
('Eve Davis', 'eve@company.com', 29, 'Sales', 70000.00),
('Frank Wilson', 'frank@company.com', 36, 'Engineering', 85000.00),
('Grace Miller', 'grace@company.com', 25, 'Marketing', 62000.00),
('Henry Taylor', 'henry@company.com', 33, 'Design', 68000.00),
('Ivy Anderson', 'ivy@company.com', 27, 'Sales', 72000.00),
('Jack Moore', 'jack@company.com', 39, 'Engineering', 92000.00),
('Kate Thomas', 'kate@company.com', 24, 'Marketing', 58000.00),
('Leo Jackson', 'leo@company.com', 31, 'Sales', 74000.00),
('Maya Patel', 'maya@company.com', 26, 'Design', 64000.00),
('Nathan Kim', 'nathan@company.com', 35, 'Engineering', 88000.00),
('Olivia Chen', 'olivia@company.com', 30, 'Marketing', 66000.00);`,
          description: "Inserts 15 sample users (perfect for testing pagination with 10 rows per page)"
        }
      ]
    },
    select: {
      title: "📊 SELECT Queries (Pagination Test)",
      description: "Test pagination with various SELECT queries",
      queries: [
        {
          name: "All Users (Page 1)",
          type: "SELECT",
          sql: "SELECT * FROM demo_users ORDER BY id;",
          description: "Shows first 10 users (page 1 of 2)"
        },
        {
          name: "Users by Department",
          type: "SELECT", 
          sql: "SELECT department, COUNT(*) as count, AVG(salary) as avg_salary FROM demo_users GROUP BY department ORDER BY count DESC;",
          description: "Aggregated data by department"
        },
        {
          name: "High Earners",
          type: "SELECT",
          sql: "SELECT name, email, department, salary FROM demo_users WHERE salary > 70000 ORDER BY salary DESC;",
          description: "Users earning more than $70k"
        },
        {
          name: "Young Engineers", 
          type: "SELECT",
          sql: "SELECT name, age, salary FROM demo_users WHERE department = 'Engineering' AND age < 35 ORDER BY age;",
          description: "Young engineering talent"
        }
      ]
    },
    write: {
      title: "✏️ Write Operations",
      description: "INSERT, UPDATE, DELETE operations",
      queries: [
        {
          name: "Add New User",
          type: "INSERT",
          sql: "INSERT INTO demo_users (name, email, age, department, salary) VALUES ('Test User', 'test@company.com', 25, 'Testing', 55000.00);",
          description: "Adds a new test user"
        },
        {
          name: "Salary Increase",
          type: "UPDATE", 
          sql: "UPDATE demo_users SET salary = salary * 1.1 WHERE department = 'Engineering';",
          description: "Give 10% raise to Engineering team"
        },
        {
          name: "Update Email",
          type: "UPDATE",
          sql: "UPDATE demo_users SET email = 'newemail@company.com' WHERE name = 'Test User';",
          description: "Update specific user's email"
        },
        {
          name: "Remove Test User",
          type: "DELETE",
          sql: "DELETE FROM demo_users WHERE name = 'Test User';",
          description: "Clean up test data"
        }
      ]
    },
    ddl: {
      title: "🏗️ Schema Operations",
      description: "CREATE, ALTER, DROP commands",
      queries: [
        {
          name: "Add Column",
          type: "DDL",
          sql: "ALTER TABLE demo_users ADD COLUMN phone VARCHAR(20);",
          description: "Add phone number column"
        },
        {
          name: "Create Index",
          type: "DDL", 
          sql: "CREATE INDEX idx_department ON demo_users(department);",
          description: "Create index for better performance"
        },
        {
          name: "Create View",
          type: "DDL",
          sql: "CREATE OR REPLACE VIEW high_earners AS SELECT name, department, salary FROM demo_users WHERE salary > 75000;",
          description: "Create view for high earners"
        }
      ]
    },
    utility: {
      title: "🔧 Utility Queries",
      description: "SHOW, DESCRIBE, and other utility commands", 
      queries: [
        {
          name: "Show Tables",
          type: "UTILITY",
          sql: "SHOW TABLES;",
          description: "List all tables in database"
        },
        {
          name: "Describe Table",
          type: "UTILITY",
          sql: "DESCRIBE demo_users;",
          description: "Show table structure"
        },
        {
          name: "Table Status",
          type: "UTILITY",
          sql: "SHOW TABLE STATUS LIKE 'demo_users';",
          description: "Detailed table information"
        }
      ]
    },
    multi: {
      title: "🔗 Multi-Statement",
      description: "Execute multiple statements together",
      queries: [
        {
          name: "Batch Operations",
          type: "MULTI",
          sql: `INSERT INTO demo_users (name, email, age, department, salary) VALUES ('Batch User 1', 'batch1@company.com', 28, 'Testing', 60000);
UPDATE demo_users SET age = 29 WHERE name = 'Batch User 1';
SELECT name, age, department FROM demo_users WHERE name LIKE 'Batch%';`,
          description: "Insert, update, then select in one batch"
        }
      ]
    },
    dangerous: {
      title: "⚠️ Dangerous Operations",
      description: "Potentially destructive queries (use with caution)",
      queries: [
        {
          name: "Delete All Marketing",
          type: "DANGEROUS",
          sql: "DELETE FROM demo_users WHERE department = 'Marketing';",
          description: "⚠️ Deletes all marketing users (requires confirmation)"
        },
        {
          name: "Update Without WHERE",
          type: "DANGEROUS", 
          sql: "UPDATE demo_users SET salary = 100000;",
          description: "⚠️ Updates ALL users (requires confirmation)"
        }
      ]
    }
  };

  const executeQuery = (sql: string, queryName: string) => {
    if (!connectionId) {
      alert('Please select a database connection first');
      return;
    }

    // Create new tab with the query
    const newTabId = addTab(connectionId, sql, queryName);
    setActiveTab(newTabId);
  };

  const executeCustomQuery = () => {
    if (!customSQL.trim()) {
      alert('Please enter a SQL query');
      return;
    }
    executeQuery(customSQL, 'Custom Query');
  };

  const getQueryTypeIcon = (type: string) => {
    switch (type) {
      case 'SELECT': return <Database className="h-4 w-4" />;
      case 'INSERT': return <Plus className="h-4 w-4" />;
      case 'UPDATE': return <Edit className="h-4 w-4" />;
      case 'DELETE': return <Trash2 className="h-4 w-4" />;
      case 'DDL': return <Table className="h-4 w-4" />;
      case 'MULTI': return <FileText className="h-4 w-4" />;
      case 'UTILITY': return <Settings className="h-4 w-4" />;
      case 'DANGEROUS': return <AlertTriangle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getQueryTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      'SELECT': 'default',
      'INSERT': 'secondary', 
      'UPDATE': 'secondary',
      'DELETE': 'secondary',
      'DDL': 'outline',
      'MULTI': 'outline',
      'UTILITY': 'outline',
      'DANGEROUS': 'destructive'
    };
    return variants[type] || 'default';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">🚀 Comprehensive SQL Testing Suite</h1>
        <p className="text-muted-foreground">
          Test all SQL types with proper pagination (10 rows per page)
        </p>
        {!connectionId && (
          <Badge variant="destructive">Please select a database connection first</Badge>
        )}
      </div>

      {/* Custom Query Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Custom SQL Query
          </CardTitle>
          <CardDescription>
            Enter your own SQL query to test
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Enter your SQL query here..."
            value={customSQL}
            onChange={(e) => setCustomSQL(e.target.value)}
            className="font-mono"
            rows={4}
          />
          <Button onClick={executeCustomQuery} disabled={!connectionId}>
            <Play className="h-4 w-4 mr-2" />
            Execute Custom Query
          </Button>
        </CardContent>
      </Card>

      {/* SQL Examples by Category */}
      {Object.entries(sqlExamples).map(([category, section]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.queries.map((query, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getQueryTypeIcon(query.type)}
                      <span className="font-medium">{query.name}</span>
                    </div>
                    <Badge variant={getQueryTypeBadge(query.type)}>
                      {query.type}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {query.description}
                  </p>
                  
                  <div className="bg-muted rounded p-2">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {query.sql.length > 100 
                        ? `${query.sql.substring(0, 100)}...` 
                        : query.sql
                      }
                    </pre>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => executeQuery(query.sql, query.name)}
                    disabled={!connectionId}
                    className="w-full"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Execute
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="text-center text-sm text-muted-foreground">
        <p>💡 <strong>Pagination Test:</strong> The sample data includes 15 users, perfect for testing pagination with 10 rows per page.</p>
        <p>⚠️ <strong>Safety:</strong> Dangerous queries will show confirmation dialogs.</p>
        <p>🔗 <strong>Multi-statement:</strong> Requires explicit confirmation in the safety dialog.</p>
      </div>
    </div>
  );
}
