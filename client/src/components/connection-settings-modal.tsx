import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';
import { Connection } from '../../../shared/schema';
import { logAction } from '../lib/api';

interface ConnectionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: Connection | null;
  onConnectionUpdated: () => void;
}

const ConnectionSettingsModal: React.FC<ConnectionSettingsModalProps> = ({
  isOpen,
  onClose,
  connection,
  onConnectionUpdated,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 3306,
    database: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name,
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        password: '', // Do not pre-fill password
      });
    }
  }, [connection]);

  const mutation = useMutation({
    mutationFn: async (updatedConnection: any) => {
      if (!connection) throw new Error('No connection selected');
      
      // Filter out empty password field unless it's being intentionally cleared
      const payload = { ...updatedConnection };
      if (!payload.password) {
        delete payload.password;
      }

      const response = await fetch(`/api/connections/${connection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update connection');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Connection Updated',
        description: `Connection "${formData.name}" has been updated successfully.`,
      });
      logAction('update_connection', { connection_id: connection?.id, name: formData.name });
      onConnectionUpdated();
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'port' ? parseInt(value, 10) || 0 : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  if (!connection) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Connection: {connection.name}</AlertDialogTitle>
          <AlertDialogDescription>
            Update the details for your database connection. The password is not shown for security, but you can enter a new one to update it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Connection Name</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="host">Host</Label>
              <Input id="host" name="host" value={formData.host} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="port">Port</Label>
              <Input id="port" name="port" type="number" value={formData.port} onChange={handleChange} required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="database">Database</Label>
            <Input id="database" name="database" value={formData.database} onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" value={formData.username} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password (optional)</Label>
              <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Enter new password to update" />
            </div>
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Updating...' : 'Update Connection'}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConnectionSettingsModal;
