import React from 'react';
import { ConnectionSettings } from '../components/connection-settings';

// Simple test page for connection settings
export default function ConnectionSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto">
        <ConnectionSettings />
      </div>
    </div>
  );
}
