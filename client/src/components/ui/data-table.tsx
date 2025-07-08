import React from "react";

interface Column {
  name: string;
  type: string;
}

interface DataTableProps {
  columns: Column[];
  rows: any[][];
  renderCell?: (value: any, column: Column, rowIndex: number) => React.ReactNode;
}

export default function DataTable({ columns, rows, renderCell }: DataTableProps) {
  // Add safety checks to prevent crashes
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500">
        No columns to display
      </div>
    );
  }

  if (!rows || !Array.isArray(rows)) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500">
        No data to display
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 sticky top-0">
          <tr className="border-b border-slate-200">
            {columns.map((column, index) => (
              <th
                key={column.name}
                className={`px-4 py-3 text-left font-medium text-slate-700 ${
                  index < columns.length - 1 ? "border-r border-slate-200" : ""
                }`}
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-100 hover:bg-slate-50">
              {row && Array.isArray(row) ? row.map((cell, cellIndex) => {
                const column = columns[cellIndex];
                return (
                  <td
                    key={cellIndex}
                    className={`px-4 py-3 ${
                      cellIndex < columns.length - 1 ? "border-r border-slate-100" : ""
                    }`}
                  >
                    {renderCell ? renderCell(cell, column, rowIndex) : (
                      cell === null || cell === undefined ? (
                        <span className="text-slate-400 italic">NULL</span>
                      ) : (
                        String(cell)
                      )
                    )}
                  </td>
                );
              }) : (
                <td colSpan={columns.length} className="px-4 py-3 text-slate-400 italic">
                  Invalid row data
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
