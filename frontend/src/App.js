/**
 * DA Vehicle Gate Pass System - Main Application
 * Department of Agriculture Region V
 * 
 * This is the main entry point for the React application.
 * It handles routing and authentication state management.
 * 
 * File Structure:
 * - /components/auth/    - Authentication components (Login)
 * - /components/admin/   - Admin dashboard components
 * - /components/guard/   - Guard interface components
 * - /components/common/  - Shared/reusable components
 * - /services/           - Business logic and API services
 * - /context/            - React context providers
 */

import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';

// Context providers
import { AuthProvider, useAuth } from './context/AuthContext';

// Services and constants
import { DA_LOGO_URL } from './services/constants';

// Components
import Login from './components/auth/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import GuardInterface from './components/guard/GuardInterface';
import MobileRegistration from './components/guard/MobileRegistration';

// UI Components
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Building, LogOut, WifiOff } from 'lucide-react';

// ============================================
// App Content - Main Layout with Header
// ============================================
const AppContent = () => {
  const { user, logout, loading, isOnline } = useAuth();
  const location = useLocation();

  // Loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <img 
            src={DA_LOGO_URL} 
            alt="DA Logo"
            className="w-16 h-16 mx-auto mb-4 animate-pulse object-cover rounded-full"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="w-16 h-16 bg-green-600 rounded-full hidden items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-center text-gray-500 py-8">Loading DA Vehicle Gate Pass System...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!user) {
    return <Login />;
  }

  // Authenticated - show main app
  return (
    <div>
      {/* Header - hidden during visitor registration flow */}
      {!location.pathname.includes('/register') && (
        <header className="bg-white shadow-sm border-b border-green-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Left side - Logo and title */}
              <div className="flex items-center">
                <img 
                  src={DA_LOGO_URL} 
                  alt="DA Logo"
                  className="w-8 h-8 mr-3 object-cover rounded-full"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-8 h-8 bg-green-600 rounded-full hidden items-center justify-center mr-3">
                  <Building className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                    DA Vehicle Gate Pass System
                  </h1>
                  <p className="text-xs text-gray-600">Department of Agriculture Region V</p>
                </div>
              </div>
              
              {/* Right side - Status badges and logout */}
              <div className="flex items-center space-x-2 md:space-x-4">
                {/* Offline indicator */}
                {!isOnline && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Offline
                  </Badge>
                )}
                
                {/* User role badge */}
                <Badge variant="outline" className="border-green-200 text-green-700 text-xs">
                  {user.role.toUpperCase()}
                </Badge>
                
                {/* Logout button */}
                <Button 
                  variant="outline" 
                  onClick={logout} 
                  className="border-green-200 text-green-700 hover:bg-green-50" 
                  size="sm"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main>
        <Routes>
          {/* Home route - shows Admin Dashboard or Guard Interface based on role */}
          <Route 
            path="/" 
            element={user.role === 'admin' ? <AdminDashboard /> : <GuardInterface />} 
          />
          
          {/* Visitor registration route - accessible to guards */}
          <Route path="/register" element={<MobileRegistration />} />
        </Routes>
      </main>
    </div>
  );
};

// ============================================
// Main App Component
// ============================================
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
