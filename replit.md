# Database Query Studio

## Overview

Database Query Studio is a comprehensive multi-database management application that provides a professional SQL query editor and schema browser. The application enables users to connect to multiple databases, execute SQL queries, browse database schemas, and visualize query results in an intuitive interface.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern React application using functional components and hooks
- **Vite**: Fast build tool and development server for optimal performance
- **Shadcn/ui**: Professional UI component library built on Radix UI primitives
- **TailwindCSS**: Utility-first CSS framework for consistent styling
- **React Router (Wouter)**: Lightweight client-side routing
- **TanStack Query**: Powerful data fetching and state management for server state
- **Monaco Editor**: Professional code editor for SQL query editing

### Backend Architecture
- **Express.js**: Node.js web framework handling HTTP requests and API routing
- **TypeScript**: Type-safe server-side development
- **Drizzle ORM**: Type-safe database interactions with PostgreSQL
- **Zod**: Runtime type validation and schema validation

### Component Structure
The application follows a modular component architecture:
- `ConnectionModal`: Database connection configuration
- `ConnectionSelector`: Database connection switching interface
- `SchemaBrowser`: Interactive database schema exploration
- `QueryEditor`: SQL query editor with Monaco integration
- `ResultsPanel`: Query results visualization and export functionality
- `DataTable`: Reusable data grid component

## Key Components

### Database Connection Management
- Secure storage of database connection credentials
- Support for multiple simultaneous database connections
- Connection validation and status monitoring
- Encrypted password storage for security

### Schema Browser
- Real-time database schema introspection
- Hierarchical display of databases, tables, and columns
- Visual indicators for primary keys, foreign keys, and data types
- Table row count statistics
- Interactive collapsible tree structure

### Query Editor
- Professional SQL editor with syntax highlighting
- Query execution with performance metrics
- Multiple query tabs for concurrent work
- Query history and saved queries functionality
- Real-time error detection and validation

### Results Visualization
- Paginated data grid for large result sets
- Export functionality (CSV format)
- Copy to clipboard functionality
- Performance metrics display
- Row count and execution time tracking

## Data Flow

1. **Connection Setup**: Users configure database connections through the connection modal
2. **Schema Loading**: Application fetches database schema using introspection queries
3. **Query Execution**: SQL queries are sent to the backend for execution against selected databases
4. **Result Processing**: Query results are processed and displayed in the data grid
5. **State Management**: TanStack Query manages server state with automatic caching and invalidation

## External Dependencies

### Frontend Dependencies
- **UI Framework**: Radix UI primitives for accessible components
- **Styling**: TailwindCSS for utility-first styling
- **Code Editor**: Monaco Editor for professional SQL editing
- **Data Fetching**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React for consistent iconography

### Backend Dependencies
- **Database**: Neon PostgreSQL for metadata storage
- **ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod for runtime type checking
- **Development**: tsx for TypeScript execution in development

### Build Tools
- **Vite**: Frontend build tool and development server
- **esbuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with TailwindCSS integration

## Deployment Strategy

### Development Environment
- Vite development server with hot module replacement
- tsx for TypeScript execution without compilation
- Concurrent development of frontend and backend

### Production Build
- Frontend: Vite builds optimized static assets
- Backend: esbuild bundles server code for Node.js execution
- Single-server deployment with static file serving

### Database Strategy
- PostgreSQL database for application metadata
- Drizzle migrations for schema management
- Environment-based database configuration

### Security Considerations
- Environment variables for sensitive configuration
- Encrypted storage of database credentials
- Input validation using Zod schemas
- CORS configuration for API security

## Changelog

```
Changelog:
- July 07, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```