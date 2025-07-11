import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Connection } from '../../../shared/schema';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Settings, Trash2, Plus, Database } from 'lucide-react';
import ConnectionModal from './connection-modal';
import ConnectionSettingsModal from './connection-settings-modal';
import ConnectionDeleteModal from './connection-delete-modal';

export function ConnectionSettings() {
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [connectionToEdit, setConnectionToEdit] = useState<Connection | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<Connection | null>(null);

  const { data: connections, isLoading: connectionsLoading, refetch } = useQuery<Connection[]>({
    queryKey: ['/api/connections'],
    queryFn: async () => {
      const response = await fetch('/api/connections');
      if (!response.ok) throw new Error('Failed to fetch connections');
      return response.json();
    },
  });

  const handleSettingsClick = (connection: Connection) => {
    setConnectionToEdit(connection);
    setIsSettingsModalOpen(true);
  };

  const handleDeleteClick = (connection: Connection) => {
    setConnectionToDelete(connection);
    setIsDeleteModalOpen(true);
  };

  const handleConnectionUpdated = () => {
    refetch();
  };

  const handleConnectionDeleted = () => {
    refetch();
  };

  if (connectionsLoading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Connection Settings</h2>
        <div className="text-center">Loading connections...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Connection Settings</h2>
          <p className="text-muted-foreground">Manage your database connections</p>
        </div>
        <Button onClick={() => setIsConnectionModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Connection
        </Button>
      </div>

      {!connections || connections.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Database className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No Database Connections</h3>
                <p className="text-muted-foreground">
                  Create your first database connection to start exploring your data.
                </p>
              </div>
              <Button onClick={() => setIsConnectionModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{connection.name}</CardTitle>
                    <CardDescription>
                      {connection.databaseType} • {connection.host}:{connection.port}/{connection.database}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${connection.isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
                    <span className="text-xs text-muted-foreground">
                      {connection.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Username: {connection.username}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSettingsClick(connection)}
                      className="gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(connection)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
