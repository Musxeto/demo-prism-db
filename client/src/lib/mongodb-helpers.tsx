import React from 'react';
import { isMongoDbConnection } from '@/lib/utils';

/**
 * Custom cell renderer for MongoDB results
 * Handles special MongoDB data types like ObjectId
 */
export function renderMongoDbCell(value: any, column: any, rowIndex: number) {
  // Handle ObjectId (stored as string but with ObjectId format)
  if (typeof value === 'string' && value.match(/^[0-9a-f]{24}$/)) {
    return (
      <span className="font-mono text-purple-600" title="MongoDB ObjectId">
        {value}
      </span>
    );
  }
  
  // Handle nested objects (already stringified by the backend)
  if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
    try {
      // Try to parse and format as JSON
      const parsed = JSON.parse(value);
      return (
        <span className="font-mono text-xs whitespace-pre-wrap">
          {JSON.stringify(parsed, null, 2)}
        </span>
      );
    } catch (e) {
      // If parsing fails, just return the string
      return value;
    }
  }
  
  // Handle null or undefined
  if (value === null || value === undefined) {
    return <span className="text-slate-400 italic">NULL</span>;
  }
  
  // Default: return as string
  return String(value);
}

/**
 * Helper component to add MongoDB-specific UI elements
 * to the results panel when working with MongoDB
 */
export function MongoDbBadge() {
  return (
    <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
      MongoDB
    </span>
  );
}

/**
 * Check if the query result is from MongoDB
 */
export function isMongoDbResult(result: any) {
  // Check if the result has MongoDB-specific indicators
  return result?.isMongoDB === true || (
    result?.columns && result.columns.some((col: any) => col.name === '_id')
  );
}
