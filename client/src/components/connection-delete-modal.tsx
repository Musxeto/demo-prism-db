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
      console.log('Connection prop updated:', connection);
      setLocalConnection(connection);
    }
  }, [connection]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const connectionToDelete = localConnection || connection;
      console.log('Delete mutation called with connection:', connectionToDelete);
      
      if (!connectionToDelete) {
        console.error('No connection provided to delete modal');
        throw new Error('No connection selected');
      }
      
      console.log(`Attempting to delete connection ${connectionToDelete.id}: ${connectionToDelete.name}`);
      const response = await fetch(`/api/connections/${connectionToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete API error:', errorData);
        throw new Error(errorData.detail || 'Failed to delete connection');
      }
      
      const result = await response.json();
      console.log('Delete API success:', result);
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
    const connectionToDelete = localConnection || connection;
    console.log('handleDelete called with connection:', connectionToDelete);
    deleteMutation.mutate();
  };

  const displayConnection = localConnection || connection;
  console.log('ConnectionDeleteModal render - isOpen:', isOpen, 'connection:', displayConnection);

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
