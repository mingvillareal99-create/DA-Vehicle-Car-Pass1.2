/**
 * Admin Dashboard Component
 * Main dashboard for administrators to monitor vehicles, visitors, and logs
 * Includes multiple tabs for different management functions
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../context/AuthContext';
import { API, DA_LOGO_URL } from '../../services/constants';
import OfflineStatus from '../common/OfflineStatus';
import VisitorDetailModal from '../common/VisitorDetailModal';
import DatabaseViewer from './DatabaseViewer';
import AnalyticsTab from './AnalyticsTab';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { 
  Car, 
  Shield, 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  Users,
  Activity,
  Building,
  UserPlus,
  Camera,
  WifiOff,
  Eye,
  Smartphone,
  FileText,
  Timer,
  BarChart2,
  Edit,
  Trash2,
  Bell
} from "lucide-react";

const AdminDashboard = () => {
  // Dashboard data state
  const [stats, setStats] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [logs, setLogs] = useState([]);
  const [vehicleStatus, setVehicleStatus] = useState([]);
  const [notifications, setNotifications] = useState([]);

  
  // Modal state
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  
  // Visitor Action state
  const [deleteVisitorConfirm, setDeleteVisitorConfirm] = useState(null);
  const [visitorModalDefaultEdit, setVisitorModalDefaultEdit] = useState(false);
  
  // New vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    plate_number: '',
    vehicle_type: 'da_government',
    owner_name: '',
    department: '',
    brand: '',
    color: '',
    classification: ''
  });
  
  // Vehicle management state
  const [selectedManageVehicle, setSelectedManageVehicle] = useState(null);
  const [isManageVehicleModalOpen, setIsManageVehicleModalOpen] = useState(false);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [vehiclePage, setVehiclePage] = useState(1);
  const itemsPerPage = 20;
  
  // Auth context
  const { user, isOnline } = useAuth();
  const { toast } = useToast();

  /**
   * Fetch all dashboard data in parallel
   */
  const fetchDashboardData = async () => {
    try {
      const [statsRes, vehiclesRes, visitorsRes, logsRes, statusRes, notifRes] = await Promise.all([
        axios.get(`${API}/dashboard-stats`),
        axios.get(`${API}/vehicles`),
        axios.get(`${API}/visitors`),
        axios.get(`${API}/logs?limit=20`),
        axios.get(`${API}/vehicle-status`),
        axios.get(`${API}/notifications`)
      ]);

      setStats(statsRes.data);
      setVehicles(vehiclesRes.data);
      setVisitors(visitorsRes.data);
      setLogs(logsRes.data);
      setVehicleStatus(statusRes.data);
      setNotifications(notifRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const markNotificationAsRead = async (id) => {
    try {
      await axios.put(`${API}/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        (n.id === id || n._id === id) ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Fetch dashboard data on mount and periodically
  useEffect(() => {
    // Initial fetch
    const loadData = async () => {
      await fetchDashboardData();
    };
    loadData();
    
    // Set up periodic refresh
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000);
    
    return () => clearInterval(interval);
     
  }, []);

  /**
   * Handle new vehicle creation
   */
  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/vehicles`, {
        ...newVehicle,
        plate_number: newVehicle.plate_number.toUpperCase().trim()
      });
      // Reset form
      setNewVehicle({
        plate_number: '',
        vehicle_type: 'da_government',
        owner_name: '',
        department: '',
        brand: '',
        color: '',
        classification: ''
      });
      setIsAddVehicleModalOpen(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating vehicle:', error);
      toast({ title: 'Error', description: `Error creating vehicle: ${error.response?.data?.detail || 'Unknown error'}`, variant: 'destructive' });
    }
  };

  /**
   * Handle Visitor Deletion
   */
  const handleDeleteVisitor = async (docId, e) => {
    if (e) e.stopPropagation();
    if (deleteVisitorConfirm === docId) {
      try {
        await axios.delete(`${API}/database/visitor_registrations/${docId}`);
        fetchDashboardData();
        setDeleteVisitorConfirm(null);
        if (selectedVisitor?.id === docId) setIsVisitorModalOpen(false);
        toast({ title: 'Notification', description: 'Visitor deleted successfully!' });
      } catch (error) {
        console.error('Error deleting visitor:', error);
        toast({ title: 'Error', description: `Error deleting visitor: ${error.response?.data?.detail || 'Unknown error'}`, variant: 'destructive' });
      }
    } else {
      setDeleteVisitorConfirm(docId);
      setTimeout(() => setDeleteVisitorConfirm(null), 3000);
    }
  };

  /**
   * Handle Visitor Edit Save
   */
  const handleEditVisitorSave = async (updatedData) => {
    try {
      if (!updatedData || !updatedData.id) return;
      const payload = { ...updatedData };
      
      // If setting status to active and it's already physically expired, extend it to end of current day
      if (payload.is_active !== false && new Date(payload.expires_at) <= new Date()) {
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        payload.expires_at = endOfDay.toISOString();
      }

      await axios.put(`${API}/database/visitor_registrations/${updatedData.id}`, payload);
      setIsVisitorModalOpen(false);
      setSelectedVisitor(null);
      setVisitorModalDefaultEdit(false);
      fetchDashboardData();
      toast({ title: 'Notification', description: 'Visitor updated successfully!' });
    } catch (error) {
      console.error('Error updating visitor:', error);
      toast({ title: 'Error', description: `Error updating visitor: ${error.response?.data?.detail || 'Unknown error'}`, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <OfflineStatus isOnline={isOnline} />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Department of Agriculture Region V - Vehicle Monitoring</p>
              <p className="text-sm text-gray-500">Welcome, {user?.username}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="relative p-2 h-10 w-10 border-gray-200 bg-white" data-testid="notifications-bell">
                  <Bell className="w-5 h-5 text-gray-700" />
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center p-1 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full min-w-4 h-4">
                      {notifications.filter(n => !n.is_read).length}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Notifications</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No notifications yet.</p>
                  ) : (
                    notifications.map(notif => {
                      const id = notif.id || notif._id;
                      return (
                        <div key={id} className={`p-3 rounded-lg border ${notif.is_read ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex justify-between items-start">
                            <h4 className={`font-semibold ${notif.is_read ? 'text-gray-700' : 'text-red-800'}`}>{notif.title}</h4>
                            <span className="text-xs text-gray-500">{new Date(notif.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                          {!notif.is_read && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-2 text-red-600 hover:text-red-800 hover:bg-red-100 h-8 px-2"
                              onClick={() => markNotificationAsRead(id)}
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {!isOnline && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
            <Badge variant="default" className="px-3 py-1 bg-green-600">
              <Shield className="w-4 h-4 mr-1" />
              Admin Access
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="border-green-200" data-testid="stats-today-activity">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today&apos;s Activity</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.today_entries_exits || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-emerald-200" data-testid="stats-total-vehicles">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-emerald-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_vehicles || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200" data-testid="stats-active-visitors">
            <CardContent className="p-4">
              <div className="flex items-center">
                <UserPlus className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Visitors</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_visitors || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-teal-200" data-testid="stats-inside-now">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-teal-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Inside Now</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.vehicles_inside || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-red-200" data-testid="stats-overstaying">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overstaying</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.overstaying_vehicles || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="status" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <TabsTrigger value="status" data-testid="tab-status">Vehicle Status</TabsTrigger>
            <TabsTrigger value="overstaying" data-testid="tab-overstaying" className="text-red-700 font-medium flex items-center"><AlertTriangle className="w-4 h-4 mr-1" /> Overstaying</TabsTrigger>
            <TabsTrigger value="visitors" data-testid="tab-visitors">Visitors</TabsTrigger>
            <TabsTrigger value="vehicles" data-testid="tab-vehicles">Manage Vehicles</TabsTrigger>
            <TabsTrigger value="mobile" data-testid="tab-mobile">Mobile Tools</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics" className="text-green-700 font-medium">Analytics</TabsTrigger>
            <TabsTrigger value="database" data-testid="tab-database">Database</TabsTrigger>
          </TabsList>

          {/* Vehicle Status Tab */}
          <TabsContent value="status">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-700">Vehicles Currently Inside DA Region V Premises</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {vehicleStatus.map((status) => (
                        <div 
                          key={status.plate_number} 
                          className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200"
                        >
                          <div className="flex items-center space-x-4">
                            <Badge 
                              variant={status.is_overstaying ? 'destructive' : 'default'} 
                              className={!status.is_overstaying ? 'bg-green-600' : ''}
                            >
                              {status.plate_number}
                            </Badge>
                            {status.registration_type === 'visitor' && (
                              <Badge variant="outline" className="text-blue-600 border-blue-200">VISITOR</Badge>
                            )}
                            <div>
                              <p className="font-medium">Inside since: {new Date(status.entry_time).toLocaleString()}</p>
                              <p className="text-sm text-gray-600">
                                Duration: {status.duration_hours ? `${status.duration_hours.toFixed(1)} hours` : 'N/A'}
                              </p>
                            </div>
                          </div>
                          {status.is_overstaying && (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              OVERSTAYING
                            </Badge>
                          )}
                        </div>
                      ))}
                      {vehicleStatus.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No vehicles currently inside</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-700">Recent Entry/Exit Logs</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[600px] overflow-y-auto">
                    <div className="space-y-3">
                      {logs.map((log) => (
                        <div 
                          key={log.id} 
                          className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200"
                        >
                          <div className="flex items-center space-x-3">
                            <Badge 
                              variant={log.action === 'entry' ? 'default' : 'secondary'} 
                              className={log.action === 'entry' ? 'bg-green-600' : ''}
                            >
                              {log.action === 'entry' ? <LogIn className="w-3 h-3 mr-1" /> : <LogOut className="w-3 h-3 mr-1" />}
                              {log.action.toUpperCase()}
                            </Badge>
                            <span className="font-mono font-semibold">{log.plate_number}</span>
                            <Badge variant="outline">{log.scan_method}</Badge>
                            {log.registration_type === 'visitor' && (
                              <Badge variant="outline" className="text-blue-600 border-blue-200">VISITOR</Badge>
                            )}
                            <span className="text-sm text-gray-600 hidden md:inline">Guard: {log.guard_username}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                      {logs.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No scans recorded today</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Overstaying Tab */}
          <TabsContent value="overstaying">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Overstaying Vehicles Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vehicleStatus.filter(s => s.is_overstaying).map((status) => (
                    <div 
                      key={status.plate_number} 
                      className="flex items-center justify-between p-4 border rounded-lg bg-red-50 border-red-200"
                    >
                      <div className="flex items-center space-x-4">
                        <Badge variant="destructive">
                          {status.plate_number}
                        </Badge>
                        {status.registration_type === 'visitor' && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">VISITOR</Badge>
                        )}
                        <div>
                          <p className="font-medium text-red-900">Inside since: {new Date(status.entry_time).toLocaleString()}</p>
                          <p className="text-sm text-red-700 font-medium">
                            Duration: {status.duration_hours ? `${status.duration_hours.toFixed(1)} hours` : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive" className="animate-pulse shadow-sm">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        ACTION REQUIRED
                      </Badge>
                    </div>
                  ))}
                  {vehicleStatus.filter(s => s.is_overstaying).length === 0 && (
                    <div className="text-center py-10 bg-green-50 rounded-lg border border-green-100">
                      <Shield className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      <p className="text-green-800 font-medium">All clear!</p>
                      <p className="text-sm text-green-600">No vehicles are currently overstaying.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Visitors Tab */}
          <TabsContent value="visitors">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">Visitor Registrations</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-200 px-3 py-2 text-left">Plate Number</th>
                        <th className="border border-gray-200 px-3 py-2 text-left">Type</th>
                        <th className="border border-gray-200 px-3 py-2 text-left">Driver Name</th>
                        <th className="border border-gray-200 px-3 py-2 text-left">Purpose</th>
                        <th className="border border-gray-200 px-3 py-2 text-left">Visiting</th>
                        <th className="border border-gray-200 px-3 py-2 text-left">Status</th>
                        <th className="border border-gray-200 px-3 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitors.map((visitor) => (
                        <tr 
                          key={visitor.id} 
                          className="hover:bg-blue-50 cursor-pointer transition-colors uppercase"
                          onClick={() => { setSelectedVisitor(visitor); setIsVisitorModalOpen(true); }}
                        >
                          <td className="border border-gray-200 px-3 py-2">
                            <Badge className="bg-blue-600">{visitor.plate_number}</Badge>
                          </td>
                          <td className="border border-gray-200 px-3 py-2">{visitor.vehicle_type}</td>
                          <td className="border border-gray-200 px-3 py-2">
                            {[visitor.driver_license.first_name, visitor.driver_license.middle_name, visitor.driver_license.last_name].filter(Boolean).join(' ')}
                          </td>
                          <td className="border border-gray-200 px-3 py-2">{visitor.purpose_of_visit}</td>
                          <td className="border border-gray-200 px-3 py-2">{visitor.department_visiting || 'N/A'}</td>
                          <td className="border border-gray-200 px-3 py-2">
                            <Badge 
                              variant={(visitor.is_active !== false && new Date(visitor.expires_at) > new Date()) ? 'default' : 'destructive'}
                              className={`text-xs ${(visitor.is_active !== false && new Date(visitor.expires_at) > new Date()) ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                            >
                              {(visitor.is_active !== false && new Date(visitor.expires_at) > new Date()) ? 'ACTIVE' : 'EXPIRED'}
                            </Badge>
                          </td>
                          <td className="border border-gray-200 px-3 py-2">
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="hover:bg-yellow-500 hover:text-white transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVisitor({...visitor});
                                  setVisitorModalDefaultEdit(true);
                                  setIsVisitorModalOpen(true);
                                }}
                                title="Edit"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant={deleteVisitorConfirm === visitor.id ? "destructive" : "outline"}
                                className="hover:bg-red-600 hover:text-white transition-colors"
                                onClick={(e) => handleDeleteVisitor(visitor.id, e)}
                                title="Remove"
                              >
                                <Trash2 className="w-3 h-3" />
                                {deleteVisitorConfirm === visitor.id && <span className="ml-1 text-xs">Confirm?</span>}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {visitors.length === 0 && (
                        <tr>
                          <td colSpan="7" className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                            No visitor registrations found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            
            {/* Visitor Detail Modal */}
            <VisitorDetailModal 
              visitor={selectedVisitor}
              isOpen={isVisitorModalOpen}
              onClose={() => {
                setIsVisitorModalOpen(false);
                setSelectedVisitor(null);
                setVisitorModalDefaultEdit(false);
              }}
              onSave={handleEditVisitorSave}
              defaultEditMode={visitorModalDefaultEdit}
            />
          </TabsContent>

          {/* Manage Vehicles Tab */}
          <TabsContent value="vehicles">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-green-700">Permanent Vehicle Registrations</CardTitle>
                <Dialog open={isAddVehicleModalOpen} onOpenChange={setIsAddVehicleModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Car className="w-4 h-4 mr-2" />
                      Add Vehicle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New Permanent Vehicle</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateVehicle} className="space-y-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="plate_number">Plate Number *</Label>
                          <Input
                            id="plate_number"
                            value={newVehicle.plate_number}
                            onChange={(e) => setNewVehicle({...newVehicle, plate_number: e.target.value})}
                            placeholder="ABC-1234"
                            className="font-mono mt-1"
                            required
                          />
                        </div>
                        <div>
                          <Label>Vehicle Type *</Label>
                          <Select 
                            value={newVehicle.vehicle_type} 
                            onValueChange={(value) => setNewVehicle({...newVehicle, vehicle_type: value})}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="da_government">DA Government Vehicle</SelectItem>
                              <SelectItem value="government">Government Vehicle</SelectItem>
                              <SelectItem value="public">Public Vehicle</SelectItem>
                              <SelectItem value="private">Private Vehicle</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="brand">Brand</Label>
                          <Input
                            id="brand"
                            value={newVehicle.brand}
                            onChange={(e) => setNewVehicle({...newVehicle, brand: e.target.value})}
                            placeholder="e.g. Toyota, Honda"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="color">Color</Label>
                          <Input
                            id="color"
                            value={newVehicle.color}
                            onChange={(e) => setNewVehicle({...newVehicle, color: e.target.value})}
                            placeholder="e.g. White, Black"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="classification">Classification</Label>
                          <Input
                            id="classification"
                            value={newVehicle.classification}
                            onChange={(e) => setNewVehicle({...newVehicle, classification: e.target.value})}
                            placeholder="Government / Private / DA"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="department">Department</Label>
                          <Input
                            id="department"
                            value={newVehicle.department}
                            onChange={(e) => setNewVehicle({...newVehicle, department: e.target.value})}
                            placeholder="Field Operations"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="owner_name">Owner Name *</Label>
                        <Input
                          id="owner_name"
                          value={newVehicle.owner_name}
                          onChange={(e) => setNewVehicle({...newVehicle, owner_name: e.target.value})}
                          placeholder="Juan Dela Cruz"
                          className="mt-1"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 mt-4">
                        Save Vehicle
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <table className="w-full border-collapse border border-gray-200 table-fixed text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-200 px-2 py-2 text-left capitalize w-[12%]">Plate Number</th>
                      <th className="border border-gray-200 px-2 py-2 text-left capitalize w-[14%]">Type</th>
                      <th className="border border-gray-200 px-2 py-2 text-left capitalize w-[12%]">Brand</th>
                      <th className="border border-gray-200 px-2 py-2 text-left capitalize w-[12%]">Color</th>
                      <th className="border border-gray-200 px-2 py-2 text-left capitalize w-[18%]">Owner name</th>
                      <th className="border border-gray-200 px-2 py-2 text-left capitalize w-[20%]">Status Of Employment</th>
                      <th className="border border-gray-200 px-2 py-2 text-left capitalize w-[12%]">Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.slice((vehiclePage - 1) * itemsPerPage, vehiclePage * itemsPerPage).map((vehicle) => (
                      <tr 
                        key={vehicle.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedManageVehicle(vehicle);
                          setIsManageVehicleModalOpen(true);
                        }}
                      >
                        <td className="border border-gray-200 px-2 py-2 truncate">
                          <div className="truncate" title={vehicle.plate_number}>
                            <Badge variant={vehicle.vehicle_type === 'private' ? 'secondary' : 'default'} className={vehicle.vehicle_type === 'da_government' ? 'bg-green-600' : ''}>
                              {vehicle.plate_number}
                            </Badge>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-2 py-2 truncate text-xs">
                          <div className="truncate capitalize" title={vehicle.vehicle_type}>
                            {vehicle.vehicle_type}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-2 py-2 truncate">
                          <div className="truncate capitalize" title={vehicle.brand || 'N/A'}>
                            {vehicle.brand || 'N/A'}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-2 py-2 truncate">
                          <div className="truncate capitalize" title={vehicle.color || 'N/A'}>
                            {vehicle.color || 'N/A'}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-2 py-2 truncate">
                          <div className="truncate" title={vehicle.owner_name}>
                            {vehicle.owner_name}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-2 py-2 truncate text-xs">
                          <div className="truncate" title={vehicle.department || 'N/A'}>
                            {vehicle.department || 'N/A'}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-2 py-2 truncate text-xs">
                          <div className="truncate" title={vehicle.classification || 'N/A'}>
                            {vehicle.classification || 'N/A'}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {vehicles.length === 0 && (
                      <tr>
                        <td colSpan="7" className="border border-gray-200 px-2 py-8 text-center text-sm text-gray-500">No vehicles found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                {/* Pagination Controls */}
                {vehicles.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {((vehiclePage - 1) * itemsPerPage) + 1} to {Math.min(vehiclePage * itemsPerPage, vehicles.length)} of {vehicles.length} entries
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setVehiclePage(prev => Math.max(prev - 1, 1))}
                        disabled={vehiclePage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center justify-center px-4 text-sm font-medium">
                        Page {vehiclePage} of {Math.ceil(vehicles.length / itemsPerPage)}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setVehiclePage(prev => Math.min(prev + 1, Math.ceil(vehicles.length / itemsPerPage)))}
                        disabled={vehiclePage === Math.ceil(vehicles.length / itemsPerPage)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Manage Vehicle View Detail Modal */}
                {selectedManageVehicle && (
                  <Dialog open={isManageVehicleModalOpen} onOpenChange={(val) => {
                    setIsManageVehicleModalOpen(val);
                    if (!val) setSelectedManageVehicle(null);
                  }}>
                    <DialogContent className="sm:max-w-[450px]">
                      <DialogHeader>
                        <DialogTitle className="text-xl text-green-700 flex items-center">
                          <Car className="w-5 h-5 mr-2" />
                          Vehicle Details
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div className="flexjustify-between items-center mb-4 border-b pb-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Plate Number</p>
                            <Badge className="text-lg px-3 py-1 mt-1 bg-green-600">{selectedManageVehicle.plate_number}</Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Owner</p>
                            <p className="font-medium">{selectedManageVehicle.owner_name}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Type</p>
                            <p className="font-medium capitalize">{selectedManageVehicle.vehicle_type}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Brand</p>
                            <p className="font-medium">{selectedManageVehicle.brand || 'Not Specified'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Color</p>
                            <p className="font-medium">{selectedManageVehicle.color || 'Not Specified'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Classification</p>
                            <p className="font-medium">{selectedManageVehicle.classification || 'Not Specified'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Department</p>
                            <p className="font-medium">{selectedManageVehicle.department || 'Not Specified'}</p>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Mobile Tools Tab */}
          <TabsContent value="mobile">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700 flex items-center">
                  <Smartphone className="w-5 h-5 mr-2" />
                  Mobile PWA Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Progressive Web App (PWA)</h3>
                    <p className="text-blue-700 text-sm">
                      This system works as a mobile app with offline capabilities, camera access, and home screen installation.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Camera className="w-5 h-5 text-green-600 mr-2" />
                        <h4 className="font-medium">Camera & OCR</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Automatic license data extraction from photos with manual fallback option.
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <WifiOff className="w-5 h-5 text-orange-600 mr-2" />
                        <h4 className="font-medium">Offline Support</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Continues working without internet. Data syncs automatically when online.
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <FileText className="w-5 h-5 text-purple-600 mr-2" />
                        <h4 className="font-medium">Barcode Generation</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Generates printable 1D barcodes with PDF download capability.
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Timer className="w-5 h-5 text-red-600 mr-2" />
                        <h4 className="font-medium">Visit Duration</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Configurable visit durations (2, 4, 8 hours, 1 day) with automatic expiry.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2">Installation Instructions</h3>
                    <ol className="text-green-700 text-sm space-y-1">
                      <li>1. Open this site on your mobile device</li>
                      <li>2. Tap the browser menu and select &quot;Add to Home Screen&quot;</li>
                      <li>3. The app will work like a native mobile app</li>
                      <li>4. Camera permissions will be requested for license scanning</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsTab logs={logs} vehicles={vehicles} />
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database">
            <DatabaseViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
