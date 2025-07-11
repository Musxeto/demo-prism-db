import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './ui/alert-dialog';
import { useToast } from '../hooks/use-toast';
import { Connection } from '../../../shared/schema';
import { logAction } from '../lib/api';

interface ConnectionDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: Connection | null;
  onConnectionDeleted: () => void;
}

const ConnectionDeleteModal: React.FC<ConnectionDeleteModalProps> = ({
  isOpen,
  onClose,
  connection,
  onConnectionDeleted,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Store the connection in local state to prevent it from being lost
  const [localConnection, setLocalConnection] = React.useState<Connection | null>(null);

  // Update local connection when the prop changes
  React.useEffect(() => {
    if (connection) {
      setLocalConnection(connection);
    }
  }, [connection]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const connectionToDelete = localConnection || connection;
      
      if (!connectionToDelete) {
        throw new Error('No connection selected');
      }
      
      const response = await fetch(`/api/connections/${connectionToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete connection');
      }
      
      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      const connectionName = localConnection?.name || connection?.name || 'Unknown';
      const connectionId = localConnection?.id || connection?.id;
      
      toast({
        title: 'Connection Deleted',
        description: `Connection "${connectionName}" has been deleted successfully.`,
      });
      logAction('delete_connection', { connection_id: connectionId, name: connectionName });
      onConnectionDeleted();
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message,
      });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const displayConnection = localConnection || connection;

  if (!displayConnection) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Connection</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the connection "{displayConnection.name}"? 
            This action cannot be undone. Any active query tabs using this connection will be closed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Connection'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConnectionDeleteModal;
