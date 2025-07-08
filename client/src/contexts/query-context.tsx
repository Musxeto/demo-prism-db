import React, { createContext, useContext, useState, ReactNode } from 'react';

interface QueryContextType {
  currentQuery: {
    sql: string;
    connectionId: number;
    page: number;
    pageSize: number;
  } | null;
  setCurrentQuery: (query: {
    sql: string;
    connectionId: number;
    page: number;
    pageSize: number;
  }) => void;
}

const QueryContext = createContext<QueryContextType | undefined>(undefined);

export function QueryProvider({ children }: { children: ReactNode }) {
  const [currentQuery, setCurrentQuery] = useState<QueryContextType['currentQuery']>(null);

  return (
    <QueryContext.Provider value={{ currentQuery, setCurrentQuery }}>
      {children}
    </QueryContext.Provider>
  );
}

export function useQueryContext() {
  const context = useContext(QueryContext);
  if (context === undefined) {
    throw new Error('useQueryContext must be used within a QueryProvider');
  }
  return context;
}
