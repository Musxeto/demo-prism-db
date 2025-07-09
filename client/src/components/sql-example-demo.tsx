import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Play, 
  Database, 
  Zap, 
  FileText, 
  AlertTriangle, 
  Shield,
  Copy,
  Clock
} from 'lucide-react';

interface SQLExampleDemoProps {
  onRunExample: (sql: string, options?: { allowMultiple?: boolean; confirmDangerous?: boolean }) => void;
  isExecuting?: boolean;
}

export function SQLExampleDemo({ onRunExample, isExecuting = false }: SQLExampleDemoProps) {
  const [customSQL, setCustomSQL] = useState('');

  const sqlExamples = {
    select: [
      {
        title: "Basic SELECT",
        description: "Retrieve all users",
        sql: "SELECT * FROM users LIMIT 10;",
        type: "safe"
      },
      {
        title: "JOIN Query",
        description: "Users with their orders",
        sql: `SELECT u.username, u.email, o.total_amount, o.status
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY o.created_at DESC;`,
        type: "safe"
      },
      {
        title: "Aggregation",
        description: "Order statistics by user",
        sql: `SELECT 
  u.username,
  COUNT(o.id) as order_count,
  SUM(o.total_amount) as total_spent,
  AVG(o.total_amount) as avg_order_value
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username
HAVING COUNT(o.id) > 0
ORDER BY total_spent DESC;`,
        type: "safe"
      }
    ],
    write: [
      {
        title: "INSERT New User",
        description: "Add a new user to the database",
        sql: "INSERT INTO users (username, email) VALUES ('jane_doe', 'jane@example.com');",
        type: "safe"
      },
      {
        title: "UPDATE User Email",
        description: "Update a specific user's email",
        sql: "UPDATE users SET email = 'newemail@example.com' WHERE username = 'jane_doe';",
        type: "safe"
      },
      {
        title: "DELETE Specific Order",
        description: "Remove a cancelled order",
        sql: "DELETE FROM orders WHERE status = 'cancelled' AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);",
        type: "safe"
      },
      {
        title: "Batch INSERT",
        description: "Insert multiple products at once",
        sql: `INSERT INTO products (name, price, category_id) VALUES 
('Gaming Mouse', 79.99, 1),
('Mechanical Keyboard', 129.99, 1),
('USB Cable', 19.99, 1);`,
        type: "safe"
      }
    ],
    dangerous: [
      {
        title: "DELETE All Users",
        description: "⚠️ Removes ALL users from the database",
        sql: "DELETE FROM users;",
        type: "dangerous"
      },
      {
        title: "UPDATE Without WHERE",
        description: "⚠️ Updates ALL products",
        sql: "UPDATE products SET price = 0;",
        type: "dangerous"
      },
      {
        title: "TRUNCATE Table",
        description: "⚠️ Removes all data from orders table",
        sql: "TRUNCATE TABLE orders;",
        type: "dangerous"
      }
    ],
    ddl: [
      {
        title: "CREATE Table",
        description: "Create a new customers table",
        sql: `CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
        type: "safe"
      },
      {
        title: "ALTER Table",
        description: "Add a column to existing table",
        sql: "ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL;",
        type: "safe"
      },
      {
        title: "CREATE INDEX",
        description: "Add index for better performance",
        sql: "CREATE INDEX idx_users_email ON users(email);",
        type: "safe"
      },
      {
        title: "DROP Table",
        description: "⚠️ Remove a table completely",
        sql: "DROP TABLE IF EXISTS customers;",
        type: "dangerous"
      }
    ],
    multi: [
      {
        title: "Multi-Statement Transaction",
        description: "Multiple operations in sequence",
        sql: `INSERT INTO users (username, email) VALUES ('multi_user', 'multi@example.com');

UPDATE users SET last_login = NOW() WHERE username = 'multi_user';

SELECT * FROM users WHERE username = 'multi_user';`,
        type: "multi"
      },
      {
        title: "Complex Multi-Operation",
        description: "Create, populate, and query new data",
        sql: `CREATE TABLE IF NOT EXISTS temp_stats (
  user_id INT,
  order_count INT,
  total_amount DECIMAL(10,2)
);

INSERT INTO temp_stats (user_id, order_count, total_amount)
SELECT u.id, COUNT(o.id), COALESCE(SUM(o.total_amount), 0)
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;

SELECT * FROM temp_stats ORDER BY total_amount DESC;`,
        type: "multi"
      }
    ],
    utility: [
      {
        title: "SHOW Tables",
        description: "List all tables in database",
        sql: "SHOW TABLES;",
        type: "safe"
      },
      {
        title: "DESCRIBE Table",
        description: "Show table structure",
        sql: "DESCRIBE users;",
        type: "safe"
      },
      {
        title: "EXPLAIN Query",
        description: "Show query execution plan",
        sql: "EXPLAIN SELECT * FROM users WHERE email LIKE '%@example.com';",
        type: "safe"
      },
      {
        title: "Table Information",
        description: "Get detailed table info",
        sql: `SELECT 
  table_name,
  table_rows,
  data_length,
  index_length
FROM information_schema.tables 
WHERE table_schema = DATABASE()
ORDER BY data_length DESC;`,
        type: "safe"
      }
    ]
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'safe': return <Database className="h-4 w-4 text-green-500" />;
      case 'dangerous': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'multi': return <FileText className="h-4 w-4 text-orange-500" />;
      default: return <Zap className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'safe': return <Badge variant="default" className="bg-green-100 text-green-800">Safe</Badge>;
      case 'dangerous': return <Badge variant="destructive">Dangerous</Badge>;
      case 'multi': return <Badge variant="outline" className="border-orange-500 text-orange-700">Multi-Statement</Badge>;
      default: return <Badge variant="secondary">Safe</Badge>;
    }
  };

  const handleRunExample = (example: any) => {
    const options: any = {};
    
    if (example.type === 'multi') {
      options.allowMultiple = true;
    }
    
    if (example.type === 'dangerous') {
      options.confirmDangerous = true;
    }
    
    onRunExample(example.sql, options);
  };

  const handleRunCustom = () => {
    if (customSQL.trim()) {
      onRunExample(customSQL.trim());
    }
  };

  const copyToClipboard = (sql: string) => {
    navigator.clipboard.writeText(sql);
  };

  const renderExampleCard = (example: any, index: number) => (
    <Card key={index} className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon(example.type)}
            <CardTitle className="text-sm">{example.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getTypeBadge(example.type)}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(example.sql)}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          {example.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="bg-muted p-3 rounded-md">
            <code className="text-xs whitespace-pre-wrap break-all">
              {example.sql}
            </code>
          </div>
          <Button
            onClick={() => handleRunExample(example)}
            disabled={isExecuting}
            size="sm"
            className="w-full gap-2"
            variant={example.type === 'dangerous' ? 'destructive' : 'default'}
          >
            {isExecuting ? (
              <>
                <Clock className="h-3 w-3 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Run {example.type === 'dangerous' ? 'Dangerous' : ''} Query
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">SQL Query Examples</h2>
        <p className="text-muted-foreground">
          Explore different types of SQL operations with safety features and multi-statement support.
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          This demo showcases the comprehensive SQL execution engine with safety checks for dangerous operations 
          and support for multi-statement queries. Each query type has appropriate warnings and confirmations.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="select" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="select">SELECT</TabsTrigger>
          <TabsTrigger value="write">WRITE</TabsTrigger>
          <TabsTrigger value="ddl">DDL</TabsTrigger>
          <TabsTrigger value="dangerous">Dangerous</TabsTrigger>
          <TabsTrigger value="multi">Multi-Statement</TabsTrigger>
          <TabsTrigger value="utility">Utility</TabsTrigger>
        </TabsList>

        <TabsContent value="select" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {sqlExamples.select.map(renderExampleCard)}
          </div>
        </TabsContent>

        <TabsContent value="write" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {sqlExamples.write.map(renderExampleCard)}
          </div>
        </TabsContent>

        <TabsContent value="ddl" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {sqlExamples.ddl.map(renderExampleCard)}
          </div>
        </TabsContent>

        <TabsContent value="dangerous" className="space-y-4">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>⚠️ Warning:</strong> These queries can permanently modify or delete data. 
              They will trigger safety confirmations before execution.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 md:grid-cols-2">
            {sqlExamples.dangerous.map(renderExampleCard)}
          </div>
        </TabsContent>

        <TabsContent value="multi" className="space-y-4">
          <Alert className="mb-4">
            <FileText className="h-4 w-4" />
            <AlertDescription>
              These queries contain multiple SQL statements that will be executed in sequence. 
              You'll need to confirm multi-statement execution.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4">
            {sqlExamples.multi.map(renderExampleCard)}
          </div>
        </TabsContent>

        <TabsContent value="utility" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {sqlExamples.utility.map(renderExampleCard)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Custom SQL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Custom SQL Query
          </CardTitle>
          <CardDescription>
            Write and execute your own SQL queries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter your SQL query here..."
            value={customSQL}
            onChange={(e) => setCustomSQL(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <Button
            onClick={handleRunCustom}
            disabled={!customSQL.trim() || isExecuting}
            className="gap-2"
          >
            {isExecuting ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Custom Query
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
