import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Connection } from '../../../shared/schema';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Settings, Trash2, Plus } from 'lucide-react';
import ConnectionModal from './connection-modal';
import ConnectionSettingsModal from './connection-settings-modal';
import ConnectionDeleteModal from './connection-delete-modal';

// Debug component to test connection operations
export function ConnectionDebugPanel() {
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [connectionToEdit, setConnectionToEdit] = useState<Connection | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<Connection | null>(null);

  const { data: connections, isLoading, refetch } = useQuery<Connection[]>({
    queryKey: ['/api/connections'],
    queryFn: async () => {
      const response = await fetch('/api/connections');
      if (!response.ok) throw new Error('Failed to fetch connections');
      return response.json();
    },
  });

  const handleSettingsClick = (connection: Connection) => {
    console.log('Settings clicked for:', connection);
    setConnectionToEdit(connection);
    setIsSettingsModalOpen(true);
  };

  const handleDeleteClick = (connection: Connection) => {
    console.log('Delete clicked for:', connection);
    setConnectionToDelete(connection);
    setIsDeleteModalOpen(true);
  };

  const handleConnectionUpdated = () => {
    console.log('Connection updated, refetching...');
    refetch();
  };

  const handleConnectionDeleted = () => {
    console.log('Connection deleted, refetching...');
    refetch();
  };

  if (isLoading) {
    return <div className="p-4">Loading connections...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Connection Debug Panel</h2>
        <Button onClick={() => setIsConnectionModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Connection
        </Button>
      </div>

      <div className="grid gap-4">
        {connections?.map((connection) => (
          <Card key={connection.id} className="border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {connection.name} (ID: {connection.id})
                  </CardTitle>
                  <CardDescription>
                    {connection.databaseType} • {connection.host}:{connection.port}/{connection.database}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSettingsClick(connection)}
                    className="gap-2 bg-blue-50 border-blue-300"
                  >
                    <Settings className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(connection)}
                    className="gap-2 bg-red-50 border-red-300 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Username: {connection.username} | Active: {connection.isActive ? 'Yes' : 'No'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        onConnectionCreated={() => {
          setIsConnectionModalOpen(false);
          refetch();
        }}
      />

      {/* Connection Settings Modal */}
      <ConnectionSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          setConnectionToEdit(null);
        }}
        connection={connectionToEdit}
        onConnectionUpdated={handleConnectionUpdated}
      />

      {/* Connection Delete Modal */}
      <ConnectionDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setConnectionToDelete(null);
        }}
        connection={connectionToDelete}
        onConnectionDeleted={handleConnectionDeleted}
      />
    </div>
  );
}
