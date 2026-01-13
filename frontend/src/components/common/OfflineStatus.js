/**
 * Offline Status Banner Component
 * Displays a red banner at the top of the screen when offline
 */
import React from 'react';
import { WifiOff } from 'lucide-react';

const OfflineStatus = ({ isOnline }) => {
  // Don't render anything if online
  if (isOnline) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 text-center z-50"
      data-testid="offline-status-banner"
    >
      <div className="flex items-center justify-center space-x-2">
        <WifiOff className="w-4 h-4" />
        <span>You are offline. Data will sync when connection is restored.</span>
      </div>
    </div>
  );
};

export default OfflineStatus;
