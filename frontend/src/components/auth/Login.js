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
import { LogIn, AlertTriangle, Building, WifiOff, Eye, EyeOff } from "lucide-react";
import OfflineStatus from '../common/OfflineStatus';

const Login = () => {
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#004B23] via-[#004B23]/90 to-[#38B000]">
      {/* Background Image Layer (shows over the gradient if the file exists) */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg_gatepass.jpg')" }}
      />
      
      {/* Subtle overlay to enhance text readability over the background image */}
      <div className="absolute inset-0 z-0 bg-[#004B23]/10 backdrop-blur-[1px]"></div>

      {/* Content wrapper */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center">
        {/* Offline indicator */}
        <OfflineStatus isOnline={isOnline} />

        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-md relative overflow-hidden mt-4">
        {/* Accent bar at top */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FFD60A] to-[#FF8500]" />
        <CardHeader className="text-center pb-8 pt-10">
          {/* DA Logo */}
          <div className="mx-auto w-28 h-28 mb-6 flex items-center justify-center bg-white rounded-full p-2 shadow-lg border-2 border-[#FFD60A]/50">
            <img
              src={DA_LOGO_URL}
              alt="Department of Agriculture Region V"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback icon if logo fails to load */}
            <div className="w-full h-full bg-[#38B000] rounded-full hidden items-center justify-center">
              <Building className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Title */}
          <CardTitle className="text-3xl font-extrabold text-[#004B23] mb-2 tracking-tight">
            DA Gate Pass System
          </CardTitle>
          <p className="text-gray-600 font-semibold tracking-wide">Department of Agriculture Region V</p>
          <p className="text-sm text-gray-500 mt-2">Sign in to access the vehicle monitoring system</p>

          {/* Offline mode indicator */}
          {!isOnline && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-[#FF8500] font-medium bg-[#FF8500]/10 py-1.5 px-3 rounded-full mx-auto w-max">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">Offline Mode</span>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username field */}
            <div>
              <Label htmlFor="username" className="text-sm font-semibold text-gray-700 ml-1 mb-1 block">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
                className="h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#38B000]/30 focus-visible:border-[#38B000] shadow-inner transition-all text-base placeholder:text-gray-400 mt-1"
                data-testid="login-username-input"
              />
            </div>

            {/* Password field */}
            <div>
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700 ml-1 mb-1 block">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#38B000]/30 focus-visible:border-[#38B000] shadow-inner transition-all text-base placeholder:text-gray-400 pr-11"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none bg-transparent border-none"
                  tabIndex="-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
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
              className="w-full bg-[#004B23] hover:bg-[#38B000] text-white text-lg py-6 mt-4 shadow-md transition-all duration-300 hover:shadow-lg"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <LogIn className="w-5 h-5 ml-2" />
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Login;
