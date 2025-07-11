import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InsertConnection } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionCreated: () => void;
}

export default function ConnectionModal({
  isOpen,
  onClose,
  onConnectionCreated,
}: ConnectionModalProps) {
  const [formData, setFormData] = useState<InsertConnection>({
    name: "",
    host: "",
    port: 3306,
    database: "",
    username: "",
    password: "",
    databaseType: "mysql",
    isActive: true,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createConnectionMutation = useMutation({
    mutationFn: async (data: InsertConnection) => {
      const response = await apiRequest("POST", "/api/connections", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Connection created",
        description: "Database connection has been successfully created",
      });
      onConnectionCreated();
      handleReset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create connection",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleReset = () => {
    setFormData({
      name: "",
      host: "",
      port: 3306,
      database: "",
      username: "",
      password: "",
      databaseType: "mysql",
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.host || !formData.database || !formData.username) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createConnectionMutation.mutate(formData);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Database Connection</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Connection Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Production Database"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="host">Host *</Label>
              <Input
                id="host"
                value={formData.host}
                onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                placeholder="localhost"
                required
              />
            </div>
            <div>
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 3306 }))}
                placeholder="3306"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="database">Database Name *</Label>
              <Input
                id="database"
                value={formData.database}
                onChange={(e) => setFormData(prev => ({ ...prev, database: e.target.value }))}
                placeholder="database_name"
                required
              />
            </div>
            <div>
              <Label htmlFor="databaseType">Database Type *</Label>
              <Select 
                value={formData.databaseType} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  databaseType: value, 
                  port: value === 'postgres' ? 5432 : 
                        value === 'mongodb' ? 27017 : 3306 
                }))}
              >
                <SelectTrigger id="databaseType">
                  <SelectValue placeholder="Select database type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mongodb">MongoDB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="username"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createConnectionMutation.isPending}
            >
              {createConnectionMutation.isPending ? "Testing..." : "Test & Save Connection"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
