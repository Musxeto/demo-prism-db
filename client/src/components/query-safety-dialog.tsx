import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertTriangle, Shield, FileText } from "lucide-react";
import { Checkbox } from "./ui/checkbox";

interface QuerySafetyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: { allowMultiple?: boolean; confirmDangerous?: boolean }) => void;
  sql: string;
  warnings?: string[];
  isDangerous?: boolean;
  isMultiStatement?: boolean;
}

export function QuerySafetyDialog({
  isOpen,
  onClose,
  onConfirm,
  sql,
  warnings = [],
  isDangerous = false,
  isMultiStatement = false,
}: QuerySafetyDialogProps) {
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [confirmDangerous, setConfirmDangerous] = useState(false);

  const handleConfirm = () => {
    onConfirm({
      allowMultiple: isMultiStatement ? allowMultiple : undefined,
      confirmDangerous: isDangerous ? confirmDangerous : undefined,
    });
    onClose();
  };

  const getIcon = () => {
    if (isDangerous) return <AlertTriangle className="h-6 w-6 text-red-500" />;
    if (isMultiStatement) return <FileText className="h-6 w-6 text-orange-500" />;
    return <Shield className="h-6 w-6 text-blue-500" />;
  };

  const getTitle = () => {
    if (isDangerous && isMultiStatement) return "Dangerous Multi-Statement Query Detected";
    if (isDangerous) return "Potentially Dangerous Query Detected";
    if (isMultiStatement) return "Multi-Statement Query Detected";
    return "Query Safety Check";
  };

  const getDescription = () => {
    const parts = [];
    
    if (isDangerous) {
      parts.push("This query contains operations that may modify or delete data permanently.");
    }
    
    if (isMultiStatement) {
      parts.push("This query contains multiple SQL statements that will be executed in sequence.");
    }
    
    parts.push("Please review the query carefully before proceeding.");
    
    return parts.join(" ");
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <AlertDialogTitle>{getTitle()}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {getDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {warnings.map((warning, index) => (
                    <div key={index}>• {warning}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* SQL Preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">SQL Query:</h4>
            <div className="bg-muted p-3 rounded-md max-h-40 overflow-auto">
              <code className="text-sm whitespace-pre-wrap break-all">
                {sql}
              </code>
            </div>
          </div>

          {/* Safety Confirmations */}
          <div className="space-y-3 pt-2">
            {isMultiStatement && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allow-multiple"
                  checked={allowMultiple}
                  onCheckedChange={setAllowMultiple}
                />
                <label
                  htmlFor="allow-multiple"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I understand this will execute multiple SQL statements
                </label>
              </div>
            )}

            {isDangerous && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirm-dangerous"
                  checked={confirmDangerous}
                  onCheckedChange={setConfirmDangerous}
                />
                <label
                  htmlFor="confirm-dangerous"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I understand this operation may modify or delete data permanently
                </label>
              </div>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={
              (isMultiStatement && !allowMultiple) ||
              (isDangerous && !confirmDangerous)
            }
            className={isDangerous ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {isDangerous ? "Execute Dangerous Query" : "Execute Query"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
