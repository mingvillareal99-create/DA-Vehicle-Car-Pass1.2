/**
 * Login Component
 * Displays the login form for admin and guard users
 */
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DA_LOGO_URL } from '../../services/constants';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { LogIn, AlertTriangle, Building, WifiOff } from "lucide-react";
import OfflineStatus from '../common/OfflineStatus';

const Login = () => {
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Auth context
  const { login, isOnline } = useAuth();

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(username, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      {/* Offline indicator */}
      <OfflineStatus isOnline={isOnline} />
      
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-8">
          {/* DA Logo */}
          <div className="mx-auto w-20 h-20 mb-6 flex items-center justify-center">
            <img 
              src={DA_LOGO_URL} 
              alt="Department of Agriculture Region V"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback icon if logo fails to load */}
            <div className="w-20 h-20 bg-green-600 rounded-full hidden items-center justify-center">
              <Building className="w-10 h-10 text-white" />
            </div>
          </div>
          
          {/* Title */}
          <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
            DA Vehicle Gate Pass
          </CardTitle>
          <p className="text-gray-600">Department of Agriculture Region V</p>
          <p className="text-sm text-gray-500">Sign in to access the vehicle monitoring system</p>
          
          {/* Offline mode indicator */}
          {!isOnline && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-orange-600">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">Offline Mode</span>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username field */}
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
                className="mt-1 text-lg"
                data-testid="login-username-input"
              />
            </div>

            {/* Password field */}
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="mt-1 text-lg"
                data-testid="login-password-input"
              />
            </div>

            {/* Error message */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit button */}
            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-3" 
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? 'Signing In...' : 'Sign In'}
              <LogIn className="w-5 h-5 ml-2" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
