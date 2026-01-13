/**
 * Guard Interface Component
 * Mobile-friendly view for security guards to scan vehicles and register visitors
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API, DA_LOGO_URL } from '../../services/constants';
import OfflineStatus from '../common/OfflineStatus';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { 
  Scan, 
  KeyboardIcon, 
  UserPlus, 
  Shield, 
  Building,
  Activity,
  LogIn,
  LogOut,
  WifiOff
} from "lucide-react";

const GuardInterface = () => {
  // State
  const [plateNumber, setPlateNumber] = useState('');
  const [scanMethod, setScanMethod] = useState('scanner');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  
  // Hooks
  const { user, isOnline } = useAuth();
  const navigate = useNavigate();

  // Check if on mobile device
  const isMobile = window.innerWidth <= 768;

  // Fetch recent logs on mount and periodically
  useEffect(() => {
    fetchRecentLogs();
    const interval = setInterval(fetchRecentLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Fetch recent entry/exit logs for display
   */
  const fetchRecentLogs = async () => {
    try {
      const response = await axios.get(`${API}/logs?limit=10`);
      setRecentLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  /**
   * Handle vehicle scan/entry submission
   */
  const handleScan = async (e) => {
    e.preventDefault();
    if (!plateNumber.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API}/scan`, {
        plate_number: plateNumber.toUpperCase().trim(),
        scan_method: scanMethod
      });

      setMessage({
        type: 'success',
        text: response.data.message,
        warning: response.data.warning
      });
      setPlateNumber('');
      fetchRecentLogs();
    } catch (error) {
      if (error.response?.status === 404) {
        // Vehicle not found - offer to register
        setMessage({
          type: 'error',
          text: 'Vehicle not found. Would you like to register this visitor?',
          showRegisterButton: true
        });
      } else {
        setMessage({
          type: 'error',
          text: error.response?.data?.detail || 'Scan failed'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <OfflineStatus isOnline={isOnline} />
      
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6 mb-6">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <img 
                src={DA_LOGO_URL} 
                alt="DA Logo"
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-12 h-12 bg-green-600 rounded-full hidden items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Guard Station</h1>
                <p className="text-gray-600">Welcome, {user?.username}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isOnline && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </Badge>
              )}
              <Badge variant="secondary" className="px-3 py-1 bg-green-100 text-green-800">
                <Shield className="w-4 h-4 mr-1" />
                Guard Access
              </Badge>
            </div>
          </div>

          {/* Register New Visitor Button - Prominent on Mobile */}
          <div className="mb-6">
            <Button
              onClick={() => navigate('/register')}
              className={`bg-blue-600 hover:bg-blue-700 ${isMobile ? 'w-full text-lg py-4' : 'mb-4'}`}
              size={isMobile ? "lg" : "default"}
              data-testid="register-visitor-btn"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Register New Visitor
            </Button>
          </div>

          {/* Scanner Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <Scan className="w-5 h-5 mr-2" />
                Vehicle Scanner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="plate">Plate Number</Label>
                    <Input
                      id="plate"
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      placeholder="Enter or scan plate number"
                      className={`font-mono ${isMobile ? 'text-lg py-3' : 'text-lg'} mt-1`}
                      required
                      data-testid="plate-number-input"
                    />
                  </div>
                  <div>
                    <Label>Scan Method</Label>
                    <Select value={scanMethod} onValueChange={setScanMethod}>
                      <SelectTrigger className={isMobile ? 'py-3 mt-1' : 'mt-1'}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scanner">
                          <div className="flex items-center">
                            <Scan className="w-4 h-4 mr-2" />
                            Barcode Scanner
                          </div>
                        </SelectItem>
                        <SelectItem value="manual">
                          <div className="flex items-center">
                            <KeyboardIcon className="w-4 h-4 mr-2" />
                            Manual Input
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className={`bg-green-600 hover:bg-green-700 ${isMobile ? 'w-full text-lg py-3' : 'w-full md:w-auto'}`}
                  data-testid="scan-submit-btn"
                >
                  {loading ? 'Processing...' : 'Process Entry/Exit'}
                  {scanMethod === 'scanner' 
                    ? <Scan className="w-4 h-4 ml-2" /> 
                    : <KeyboardIcon className="w-4 h-4 ml-2" />
                  }
                </Button>
              </form>

              {/* Message display */}
              {message && (
                <div className="mt-4">
                  <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                    <AlertDescription>
                      {message.text}
                      {/* Warning message (e.g., overstaying) */}
                      {message.warning && (
                        <div className="mt-2 text-orange-600 font-medium">
                          ⚠️ {message.warning}
                        </div>
                      )}
                      {/* Register visitor button for unknown vehicles */}
                      {message.showRegisterButton && (
                        <div className="mt-3">
                          <Button
                            onClick={() => navigate('/register')}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Register Visitor
                          </Button>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <Activity className="w-5 h-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                  >
                    <div className="flex items-center space-x-3">
                      {/* Entry/Exit badge */}
                      <Badge 
                        variant={log.action === 'entry' ? 'default' : 'secondary'} 
                        className={log.action === 'entry' ? 'bg-green-600' : 'bg-gray-600'}
                      >
                        {log.action === 'entry' 
                          ? <LogIn className="w-3 h-3 mr-1" /> 
                          : <LogOut className="w-3 h-3 mr-1" />
                        }
                        {log.action.toUpperCase()}
                      </Badge>
                      <span className="font-mono font-semibold">{log.plate_number}</span>
                      <span className="text-sm text-gray-600">by {log.guard_username}</span>
                      {/* Visitor badge */}
                      {log.registration_type === 'visitor' && (
                        <Badge variant="outline" className="text-xs">VISITOR</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                
                {/* Empty state */}
                {recentLogs.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GuardInterface;
