/**
 * PWA and Offline Storage Services
 * Handles service worker registration, online status, and IndexedDB storage
 */

// ============================================
// PWA Manager - Service Worker Registration
// ============================================
export class PWAManager {
  /**
   * Register the service worker for PWA functionality
   */
  static async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered:', registration);
        return registration;
      } catch (error) {
        console.error('SW registration failed:', error);
      }
    }
  }

  /**
   * Check if the browser is currently online
   */
  static async checkOnlineStatus() {
    return navigator.onLine;
  }

  /**
   * Setup listeners for online/offline status changes
   * @param {Function} callback - Function to call with (isOnline: boolean)
   */
  static setupOnlineStatusListener(callback) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }
}

// ============================================
// Offline Storage Manager - IndexedDB
// ============================================
export class OfflineStorageManager {
  static DB_NAME = 'DAVehiclePassDB';
  static DB_VERSION = 1;

  /**
   * Open IndexedDB connection
   */
  static async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store for offline data if it doesn't exist
        if (!db.objectStoreNames.contains('offline_data')) {
          const store = db.createObjectStore('offline_data', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('endpoint', 'endpoint', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  /**
   * Store data for later sync when offline
   * @param {string} endpoint - API endpoint the data should be sent to
   * @param {Object} data - Data to store
   */
  static async storeOfflineData(endpoint, data) {
    const db = await this.openDB();
    const transaction = db.transaction(['offline_data'], 'readwrite');
    const store = transaction.objectStore('offline_data');
    
    const offlineData = {
      endpoint,
      data,
      timestamp: new Date().toISOString(),
      synced: false
    };
    
    return store.add(offlineData);
  }

  /**
   * Get all data that hasn't been synced yet
   */
  static async getUnsyncedData() {
    const db = await this.openDB();
    const transaction = db.transaction(['offline_data'], 'readonly');
    const store = transaction.objectStore('offline_data');
    const index = store.index('synced');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mark data as synced after successful upload
   * @param {number} id - The ID of the record to mark as synced
   */
  static async markAsSynced(id) {
    const db = await this.openDB();
    const transaction = db.transaction(['offline_data'], 'readwrite');
    const store = transaction.objectStore('offline_data');
    
    const item = await store.get(id);
    if (item) {
      item.synced = true;
      return store.put(item);
    }
  }
}
