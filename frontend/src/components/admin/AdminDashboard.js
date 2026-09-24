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
import OverstayingKanbanBoard from './OverstayingKanbanBoard';
import ResolutionModal from './ResolutionModal';
import TicketDetailModal from './TicketDetailModal';
import BarcodeGenerator from '../../services/BarcodeService';
import GatePassSticker from '../common/GatePassSticker';
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
  Bell,
  Menu,
  X,
  Database,
  LayoutDashboard,
  Settings,
  Clock,
  Moon,
  Sun,
  User,
  Search,
  Filter,
  Plane,
  FileCheck,
  Ticket,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Tag,
  Calendar,
  Info,
  ArrowUpRight,
  Printer,
  Download
} from "lucide-react";

const AdminDashboard = () => {
  // Navigation state
  const [activeTab, setActiveTab] = useState("status");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Helper to format strings into Title Case (First Letter Capitalized)
  const formatTitleCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Dashboard data state
  const [stats, setStats] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [logs, setLogs] = useState([]);
  const [vehicleStatus, setVehicleStatus] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tickets, setTickets] = useState([]);

  // Log search & filter state
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState('all');

  // Exceptions section filter
  const [exceptionFilter, setExceptionFilter] = useState('all');

  // Additional Modals state
  const [resolvingTicket, setResolvingTicket] = useState(null);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null);
  const [isTicketDetailModalOpen, setIsTicketDetailModalOpen] = useState(false);
  const [selectedVehicleDetail, setSelectedVehicleDetail] = useState(null);
  const [isVehicleDetailModalOpen, setIsVehicleDetailModalOpen] = useState(false);
  
  // Modal state
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  
  // Visitor Action state
  const [deleteVisitorConfirm, setDeleteVisitorConfirm] = useState(null);
  const [visitorModalDefaultEdit, setVisitorModalDefaultEdit] = useState(false);
  
  // New vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    plate_number: '',
    vehicle_type: 'private',
    owner_name: '',
    department: '',
    brand: '',
    color: '',
    classification: '',
    address: '',
    email: '',
    mobile: '',
    vehicle_category: 'Car'
  });
  
  // Vehicle management state
  const [selectedManageVehicle, setSelectedManageVehicle] = useState(null);
  const [isManageVehicleModalOpen, setIsManageVehicleModalOpen] = useState(false);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [vehiclePage, setVehiclePage] = useState(1);
  const [editVehicleData, setEditVehicleData] = useState({});
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [activeVehicleModalTab, setActiveVehicleModalTab] = useState('view');
  const itemsPerPage = 20;

  // Sync edit form state when selectedManageVehicle changes
  useEffect(() => {
    if (selectedManageVehicle) {
      setEditVehicleData({
        owner_name: selectedManageVehicle.owner_name || '',
        address: selectedManageVehicle.address || '',
        classification: selectedManageVehicle.classification || '',
        department: selectedManageVehicle.department || '',
        email: selectedManageVehicle.email || '',
        mobile: selectedManageVehicle.mobile || '',
        vehicle_category: selectedManageVehicle.vehicle_category || (selectedManageVehicle.brand && selectedManageVehicle.brand.toLowerCase().includes('yamaha') ? 'Motorcycle' : 'Car'),
        vehicle_type: selectedManageVehicle.vehicle_type || 'private',
        brand: selectedManageVehicle.brand || '',
        color: selectedManageVehicle.color || ''
      });
      setActiveVehicleModalTab('view');
    }
  }, [selectedManageVehicle]);

  const handleUpdateVehicleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedManageVehicle) return;
    setIsSavingVehicle(true);
    try {
      const id = selectedManageVehicle.id || selectedManageVehicle.plate_number;
      await axios.put(`${API}/vehicles/${encodeURIComponent(id)}`, editVehicleData);
      toast({
        title: 'Vehicle Updated',
        description: `Vehicle ${selectedManageVehicle.plate_number} details updated successfully.`
      });
      setIsManageVehicleModalOpen(false);
      setSelectedManageVehicle(null);
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast({
        title: 'Update Failed',
        description: error.response?.data?.detail || 'Could not update vehicle details',
        variant: 'destructive'
      });
    } finally {
      setIsSavingVehicle(false);
    }
  };
  
  // Auth context
  const { user, isOnline, logout } = useAuth();
  const { toast } = useToast();

  /**
   * Fetch all dashboard data in parallel
   */
  const fetchDashboardData = async () => {
    try {
      const [statsRes, vehiclesRes, visitorsRes, logsRes, statusRes, notifRes, ticketsRes] = await Promise.all([
        axios.get(`${API}/dashboard-stats`),
        axios.get(`${API}/vehicles`),
        axios.get(`${API}/visitors`),
        axios.get(`${API}/logs?limit=50`),
        axios.get(`${API}/vehicle-status`),
        axios.get(`${API}/notifications`),
        axios.get(`${API}/tickets`)
      ]);

      setStats(statsRes.data);
      setVehicles(vehiclesRes.data);
      setVisitors(visitorsRes.data);
      setLogs(logsRes.data);
      setVehicleStatus(statusRes.data);
      setNotifications(notifRes.data);
      setTickets(ticketsRes.data || []);
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

  /**
   * Issue ticket for inside vehicle
   */
  const handleIssueTicket = async (plateNumber) => {
    try {
      await axios.post(`${API}/tickets`, { plate_number: plateNumber });
      toast({
        title: 'Ticket Issued',
        description: `Overstaying / Exception ticket created for vehicle ${plateNumber}.`,
      });
      fetchDashboardData();
    } catch (error) {
      toast({
        title: 'Ticket Issue Failed',
        description: error.response?.data?.detail || 'Could not issue ticket',
        variant: 'destructive',
      });
    }
  };

  /**
   * Resolve ticket save handler
   */
  const handleResolveTicketSave = async (resolutionNote) => {
    if (!resolvingTicket) return;
    try {
      await axios.put(`${API}/tickets/${resolvingTicket.id}/status`, {
        status: 'resolved',
        resolution_note: resolutionNote,
        resolved_by: user?.username || 'admin'
      });
      toast({
        title: 'Ticket Resolved',
        description: `Ticket ${resolvingTicket.ticket_number || resolvingTicket.plate_number} marked as resolved.`
      });
      setResolvingTicket(null);
      setIsResolutionModalOpen(false);
      fetchDashboardData();
    } catch (error) {
      toast({
        title: 'Resolution Failed',
        description: error.response?.data?.detail || 'Failed to resolve ticket',
        variant: 'destructive'
      });
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
        vehicle_type: 'private',
        owner_name: '',
        department: '',
        brand: '',
        color: '',
        classification: '',
        address: '',
        email: '',
        mobile: '',
        vehicle_category: 'Car'
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
      
      // If setting status to active and it's already physically expired or empty, extend it 24 hours
      if (payload.is_active !== false && (!payload.expires_at || new Date(payload.expires_at) <= new Date())) {
        const future24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
        payload.expires_at = future24h.toISOString();
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

  /**
   * Helper to format decimal duration hours into readable format
   */
  const formatDuration = (hours) => {
    if (hours == null) return 'N/A';
    const totalMinutes = Math.round(hours * 60);
    const d = Math.floor(totalMinutes / (24 * 60));
    const h = Math.floor((totalMinutes % (24 * 60)) / 60);
    const m = totalMinutes % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // 1. Authorized vehicles currently inside (exclude overstaying / exception tickets)
  const authorizedInsideVehicles = vehicleStatus.filter(s => 
    !s.is_overstaying && 
    s.ticket_status !== 'overstaying' &&
    s.ticket_status !== 'under_investigation'
  );

  // 2. Active exceptions from tickets + auto-flagged overstaying from vehicleStatus
  const activeExceptions = [...tickets.filter(t => t.status !== 'resolved')];
  const ticketPlates = new Set(activeExceptions.map(t => t.plate_number));
  vehicleStatus.forEach(v => {
    if (v.is_overstaying && !ticketPlates.has(v.plate_number)) {
      activeExceptions.push({
        id: `auto-${v.plate_number}`,
        plate_number: v.plate_number,
        vehicle_type: v.vehicle_type || (v.registration_type === 'visitor' ? 'visitor' : 'da_government'),
        owner_name: v.owner_name || 'Unregistered Driver',
        entry_time: v.entry_time,
        status: 'overstaying',
        cause_of_overstaying: 'Exceeded maximum permitted duration without checkout',
        is_auto_flagged: true
      });
      ticketPlates.add(v.plate_number);
    }
  });

  const filteredExceptions = activeExceptions.filter(t => {
    if (exceptionFilter === 'overstaying') return t.status === 'overstaying' || t.status === 'under_investigation';
    if (exceptionFilter === 'on_travel') return t.status === 'on_travel';
    return true;
  });

  // 3. Filtered logs with search query and action/type filter
  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'entry' && log.action !== 'entry') return false;
    if (logFilter === 'exit' && log.action !== 'exit') return false;
    if (logFilter === 'visitor' && log.registration_type !== 'visitor') return false;
    if (logFilter === 'permanent' && log.registration_type === 'visitor') return false;

    if (logSearch.trim()) {
      const q = logSearch.toLowerCase().trim();
      const plate = (log.plate_number || '').toLowerCase();
      const owner = (log.owner_name || '').toLowerCase();
      const guard = (log.guard_username || '').toLowerCase();
      const vtype = (log.vehicle_type || '').toLowerCase();
      return plate.includes(q) || owner.includes(q) || guard.includes(q) || vtype.includes(q);
    }
    return true;
  });

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-[#F8F9FA]'}`}>
      <OfflineStatus isOnline={isOnline} />
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-[#004B23] text-white transition-all duration-300 transform 
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          w-64 md:w-20 md:hover:w-64 group shadow-xl md:shadow-none relative overflow-hidden`}
      >
        {/* Background Image Layer */}
        <div 
          className="absolute z-0 bg-cover bg-left bg-no-repeat w-[125%] h-[125%] -top-[12.5%] left-0 origin-left scale-80"
          style={{ backgroundImage: "url('/bg_gatepass.jpg')" }}
        />
        
        {/* Dark Green Overlay */}
        <div className="absolute inset-0 z-0 bg-[#004B23]/80 backdrop-blur-[1.5px]"></div>

        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-20 px-4 py-3 border-b border-[#38B000]/30 relative z-10">
          <div className="flex items-center overflow-hidden">
            <img 
              src={DA_LOGO_URL} 
              alt="DA Logo"
              className="w-12 h-12 object-cover min-w-[48px] drop-shadow-md bg-white rounded-full p-1"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="w-12 h-12 bg-[#38B000] rounded-full hidden items-center justify-center min-w-[48px]">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div className="ml-3 flex flex-col justify-center w-[160px] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 delay-75 whitespace-nowrap overflow-hidden">
              <span className="font-bold text-white tracking-wide text-base leading-tight">
                DA AgriPass
              </span>
              <span className="text-[10px] text-green-200 font-semibold leading-tight mt-1">
                Department of Agriculture Region V
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden min-w-[40px] text-white hover:bg-[#38B000]/50" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2 font-medium relative z-10">
          {[
            { id: 'status', label: 'Vehicle Status', icon: Car },
            { id: 'overstaying', label: 'Overstaying & Exceptions', icon: Clock, color: 'text-[#FFD60A] hover:text-[#FFD60A]' },
            { id: 'visitors', label: 'Visitors', icon: Users },
            { id: 'vehicles', label: 'Manage Vehicles', icon: Settings },
            { id: 'mobile', label: 'Mobile Tools', icon: Smartphone },
            { id: 'analytics', label: 'Analytics', icon: BarChart2 },
            { id: 'database', label: 'Database', icon: Database }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 overflow-hidden group/nav
                ${activeTab === item.id 
                  ? 'bg-[#38B000] text-white shadow-md font-bold' 
                  : `hover:bg-[#38B000]/20 text-green-50 ${item.color || ''}`
                }`}
            >
              <item.icon className={`w-6 h-6 min-w-[24px] transition-transform ${activeTab === item.id ? 'scale-110' : 'opacity-80 group-hover/nav:opacity-100'}`} />
              <span className="ml-4 whitespace-nowrap tracking-wide opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 delay-75">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Admin Profile & Logout */}
        <div className="p-4 border-t border-[#38B000]/30 bg-transparent relative z-10">
          <div className="flex flex-col space-y-4">
             <div className="flex items-center overflow-hidden px-1">
               <div className="w-10 h-10 min-w-[40px] bg-[#38B000] border-2 border-[#FFD60A] rounded-full flex items-center justify-center font-bold text-white text-lg shadow-md">
                 {user?.username?.charAt(0)?.toUpperCase()}
               </div>
               <div className="ml-3 whitespace-nowrap opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 delay-75 flex flex-col justify-center">
                 <p className="text-sm font-bold text-white truncate leading-tight w-36">{user?.username}</p>
                 <span className="text-xs text-green-200 font-medium">Administrator</span>
               </div>
             </div>
             
             <Button variant="outline" className="w-full justify-start text-white bg-transparent hover:bg-red-600 hover:text-white border-transparent hover:border-red-600 overflow-hidden px-3 h-10 transition-colors" onClick={logout}>
               <LogOut className="w-5 h-5 min-w-[20px] text-red-400 group-hover:text-white" />
               <span className="ml-3 whitespace-nowrap opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 delay-75 font-semibold">Log out</span>
             </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto w-full pb-10">
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="icon" className={`md:hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`} onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center space-x-2 text-sm font-medium text-[#004B23] dark:text-[#38B000] mb-1">
                  <span>Admin</span>
                  <span>/</span>
                  <span className="capitalize">{activeTab.replace('-', ' ')}</span>
                </div>
                <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Admin Dashboard</h1>
              </div>
            </div>
          <div className="flex items-center space-x-3">
            {/* Dark Mode Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`h-10 w-10 rounded-full border-none shadow-sm transition-transform hover:scale-105 ${isDarkMode ? 'bg-gray-800 text-yellow-500' : 'bg-white text-gray-700'}`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className={`relative p-2 h-10 w-10 rounded-full border-none shadow-sm transition-transform hover:scale-105 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} data-testid="notifications-bell">
                  <Bell className="w-5 h-5" />
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center p-1 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-[#FF8500] rounded-full min-w-4 h-4 shadow-md">
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
              <Badge variant="secondary" className="bg-[#FFD60A]/20 text-[#6B5A00] dark:text-[#FFD60A] border-[#FFD60A]">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
            <Badge variant="default" className="px-3 py-1 bg-[#004B23] shadow-md">
              <Shield className="w-4 h-4 mr-1 text-[#FFD60A]" />
              Admin Access
            </Badge>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {/* 1. Entries Today */}
          <Card className={`border-l-4 border-l-[#38B000] border-transparent shadow-sm hover:shadow-md transition-shadow duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} data-testid="stats-entries-today">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2.5 bg-[#38B000]/10 rounded-xl">
                  <LogIn className="h-6 w-6 text-[#38B000]" />
                </div>
                <div className="ml-3 min-w-0">
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Entries Today</p>
                  <p className={`text-2xl font-black mt-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.today_entries ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Exits Today */}
          <Card className={`border-l-4 border-l-[#2563EB] border-transparent shadow-sm hover:shadow-md transition-shadow duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} data-testid="stats-exits-today">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <LogOut className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3 min-w-0">
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Exits Today</p>
                  <p className={`text-2xl font-black mt-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.today_exits ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Inside Now (with breakdown) */}
          <Card className={`border-l-4 border-l-[#004B23] border-transparent shadow-sm hover:shadow-md transition-shadow duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} data-testid="stats-inside-now">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2.5 bg-[#004B23]/10 dark:bg-[#38B000]/20 rounded-xl">
                  <Users className="h-6 w-6 text-[#004B23] dark:text-[#38B000]" />
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Inside Now</p>
                  <p className={`text-2xl font-black mt-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.vehicles_inside ?? 0}</p>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                    <span className="text-emerald-700 dark:text-emerald-400">Perm/DA: {stats.inside_permanent ?? 0}</span>
                    <span>•</span>
                    <span className="text-blue-600 dark:text-blue-400">Visitors: {stats.inside_visitors ?? 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Total Registered */}
          <Card className={`border-l-4 border-l-[#38B000] border-transparent shadow-sm hover:shadow-md transition-shadow duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} data-testid="stats-total-vehicles">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2.5 bg-[#38B000]/10 rounded-xl">
                  <Car className="h-6 w-6 text-[#38B000]" />
                </div>
                <div className="ml-3 min-w-0">
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Registered</p>
                  <p className={`text-2xl font-black mt-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.total_vehicles ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Active Visitors */}
          <Card className={`border-l-4 border-l-[#FF8500] border-transparent shadow-sm hover:shadow-md transition-shadow duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} data-testid="stats-active-visitors">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2.5 bg-[#FF8500]/10 rounded-xl">
                  <UserPlus className="h-6 w-6 text-[#FF8500]" />
                </div>
                <div className="ml-3 min-w-0">
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Visitors</p>
                  <p className={`text-2xl font-black mt-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.total_visitors ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Overstaying / Exceptions */}
          <Card className={`border-l-4 border-l-red-500 border-transparent shadow-sm hover:shadow-md transition-shadow duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} data-testid="stats-overstaying">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2.5 bg-red-500/10 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Exceptions</p>
                  <p className="text-2xl font-black mt-0.5 text-red-600">{(stats.overstaying_vehicles ?? 0) + (stats.on_travel_vehicles ?? 0)}</p>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                    <span className="text-red-600">Overstay: {stats.overstaying_vehicles ?? 0}</span>
                    <span>•</span>
                    <span className="text-indigo-600">Travel: {stats.on_travel_vehicles ?? 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Vehicle Status Tab */}
          <TabsContent value="status" className="space-y-8 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Vehicles Currently Inside (Authorized) */}
              <div className="space-y-4">
                <Card className={`shadow-sm border ${isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/40 rounded-lg text-green-700 dark:text-green-300">
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                            Vehicles Currently Inside (Authorized)
                          </CardTitle>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {authorizedInsideVehicles.length} authorized vehicle{authorizedInsideVehicles.length === 1 ? '' : 's'} on premises
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 font-bold">
                        {authorizedInsideVehicles.length} Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 max-h-[620px] overflow-y-auto space-y-3">
                    {authorizedInsideVehicles.map((item) => (
                      <div 
                        key={item.plate_number} 
                        className={`p-3.5 border rounded-xl transition-all duration-200 hover:shadow-md ${
                          isDarkMode ? 'bg-gray-700/50 border-gray-600 hover:border-gray-500' : 'bg-gray-50/70 border-gray-200 hover:border-green-300'
                        }`}
                      >
                        {/* Header Row: Plate, Badges, Timer */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded bg-[#004B23] text-white shadow-xs tracking-wider">
                              {item.plate_number}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] uppercase font-bold ${
                                item.registration_type === 'visitor'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                              }`}
                            >
                              {item.registration_type === 'visitor' ? 'Visitor' : 'DA / Permanent'}
                            </Badge>
                            {item.classification && (
                              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-200/60 dark:bg-gray-600 px-2 py-0.5 rounded">
                                {item.classification}
                              </span>
                            )}
                          </div>
                          
                          <span className="inline-flex items-center text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                            <Timer className="w-3 h-3 mr-1" />
                            {formatDuration(item.duration_hours)}
                          </span>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-600 dark:text-gray-300 my-2">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                              {item.owner_name || 'Registered Driver'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 min-w-0">
                            <Car className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">
                              {(item.brand || item.color) 
                                ? `${item.brand || 'Vehicle'} • ${item.color || ''}`.trim()
                                : (item.vehicle_type ? item.vehicle_type.replace('_', ' ').toUpperCase() : 'Official Vehicle')}
                            </span>
                          </div>

                          {/* Visitor Specific Details */}
                          {item.registration_type === 'visitor' && (
                            <>
                              <div className="col-span-1 sm:col-span-2 flex flex-wrap gap-1.5 mt-1 pt-1 border-t border-gray-200/60 dark:border-gray-600">
                                {item.department_visiting && (
                                  <span className="text-[11px] bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                    Visiting: <strong>{item.department_visiting}</strong>
                                  </span>
                                )}
                                {item.purpose_of_visit && (
                                  <span className="text-[11px] bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                    Purpose: {item.purpose_of_visit}
                                  </span>
                                )}
                              </div>
                            </>
                          )}

                          {/* DA Permanent Specific Details */}
                          {item.registration_type !== 'visitor' && item.department && (
                            <div className="col-span-1 sm:col-span-2 text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                              Dept / Office: <span className="font-medium text-gray-700 dark:text-gray-200">{item.department}</span>
                            </div>
                          )}
                        </div>

                        {/* Footer Row: Timestamp & Action Buttons */}
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 gap-2">
                          <span className="text-[11px] text-gray-400">
                            Entered: {item.entry_time ? new Date(item.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier today'}
                          </span>

                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-800"
                              onClick={() => handleIssueTicket(item.plate_number)}
                            >
                              <Ticket className="w-3 h-3 mr-1" />
                              Issue Ticket
                            </Button>

                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 px-2 text-xs text-[#004B23] hover:text-[#004B23] hover:bg-green-50 dark:hover:bg-green-950/40 border-green-300 dark:border-green-800 font-medium"
                              onClick={() => {
                                setSelectedVehicleDetail(item);
                                setIsVehicleDetailModalOpen(true);
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {authorizedInsideVehicles.length === 0 && (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400 space-y-2">
                        <Car className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
                        <p className="font-medium">No authorized vehicles currently inside</p>
                        <p className="text-xs text-gray-400">Vehicles will appear here as they are scanned in at the gate</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Recent Entry/Exit Logs Feed */}
              <div className="space-y-4">
                <Card className={`shadow-sm border ${isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-700 dark:text-blue-300">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                            Recent Entry/Exit Logs
                          </CardTitle>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Showing {filteredLogs.length} activity record{filteredLogs.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Search & Filter Controls */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                        <Input 
                          placeholder="Search plate, driver, guard..."
                          value={logSearch}
                          onChange={(e) => setLogSearch(e.target.value)}
                          className="h-8 pl-8 text-xs bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                        />
                      </div>
                      
                      <Select value={logFilter} onValueChange={setLogFilter}>
                        <SelectTrigger className="h-8 text-xs w-full sm:w-40 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                          <SelectValue placeholder="Filter Logs" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Logs</SelectItem>
                          <SelectItem value="entry">Entries Only</SelectItem>
                          <SelectItem value="exit">Exits Only</SelectItem>
                          <SelectItem value="visitor">Visitors Only</SelectItem>
                          <SelectItem value="permanent">Permanent / DA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 max-h-[620px] overflow-y-auto space-y-2.5">
                    {filteredLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className={`p-3 border rounded-xl flex items-center justify-between gap-3 transition-colors ${
                          isDarkMode ? 'bg-gray-700/40 border-gray-700 hover:bg-gray-700/70' : 'bg-gray-50/70 border-gray-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          {/* Visual Indicator: Green for ENTRY, Blue for EXIT */}
                          <Badge 
                            className={`px-2.5 py-1 text-xs font-bold shrink-0 shadow-xs ${
                              log.action === 'entry' 
                                ? 'bg-[#38B000] hover:bg-green-700 text-white' 
                                : 'bg-[#2563EB] hover:bg-blue-700 text-white'
                            }`}
                          >
                            {log.action === 'entry' ? (
                              <LogIn className="w-3 h-3 mr-1" />
                            ) : (
                              <LogOut className="w-3 h-3 mr-1" />
                            )}
                            {log.action.toUpperCase()}
                          </Badge>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="font-mono font-bold text-sm tracking-wide text-gray-900 dark:text-white">
                                {log.plate_number}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                {log.vehicle_type ? log.vehicle_type.replace('_', ' ') : (log.registration_type || 'vehicle')}
                              </Badge>
                              {log.registration_type === 'visitor' && (
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-semibold px-1.5 py-0.2 rounded">
                                  VISITOR
                                </span>
                              )}
                            </div>

                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-2 truncate mt-0.5">
                              <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                                {log.owner_name || 'Driver on record'}
                              </span>
                              <span>•</span>
                              <span>Guard: {log.guard_username}</span>
                              <span className="hidden sm:inline">({log.scan_method})</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {filteredLogs.length === 0 && (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400 space-y-2">
                        <Activity className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
                        <p className="font-medium">No activity logs matching your filter</p>
                        <p className="text-xs text-gray-400">Try adjusting your search query or filter selection</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom Full-Width Section: Dedicated Overstaying & Operational Exceptions UI */}
            <div className="space-y-4">
              <Card className={`shadow-md border-2 ${isDarkMode ? 'bg-gray-800 border-red-900/50' : 'bg-white border-red-200'}`}>
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                            Overstaying & Operational Exceptions
                          </CardTitle>
                          <Badge className="bg-red-600 text-white font-black text-xs">
                            {activeExceptions.length} Active Exception{activeExceptions.length === 1 ? '' : 's'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Segregated monitoring of unauthorized overstaying violations versus DA vehicles on authorized overnight Travel Orders
                        </p>
                      </div>
                    </div>

                    {/* Filter Toggle */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-800 text-xs">
                      <button
                        onClick={() => setExceptionFilter('all')}
                        className={`px-3 py-1 rounded-md font-semibold transition-all ${
                          exceptionFilter === 'all'
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                        }`}
                      >
                        All ({activeExceptions.length})
                      </button>
                      <button
                        onClick={() => setExceptionFilter('overstaying')}
                        className={`px-3 py-1 rounded-md font-semibold transition-all ${
                          exceptionFilter === 'overstaying'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                        }`}
                      >
                        Unauthorized ({activeExceptions.filter(t => t.status === 'overstaying' || t.status === 'under_investigation').length})
                      </button>
                      <button
                        onClick={() => setExceptionFilter('on_travel')}
                        className={`px-3 py-1 rounded-md font-semibold transition-all ${
                          exceptionFilter === 'on_travel'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                      >
                        Travel Orders ({activeExceptions.filter(t => t.status === 'on_travel').length})
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredExceptions.map((item) => {
                      const isOnTravel = item.status === 'on_travel';
                      return (
                        <div 
                          key={item.id}
                          className={`rounded-xl border p-4 transition-all duration-200 shadow-xs flex flex-col justify-between ${
                            isOnTravel 
                              ? 'border-l-4 border-l-blue-600 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20'
                              : 'border-l-4 border-l-red-600 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20'
                          }`}
                        >
                          <div>
                            {/* Card Header: Plate and Distinction Badge */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="font-mono font-black text-sm px-2.5 py-1 rounded bg-gray-900 text-white tracking-wider">
                                {item.plate_number}
                              </span>

                              {isOnTravel ? (
                                <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold">
                                  <Plane className="w-3 h-3 mr-1" />
                                  APPROVED TRAVEL ORDER
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  UNAUTHORIZED OVERSTAY
                                </Badge>
                              )}
                            </div>

                            {/* Driver / Owner & Vehicle Info */}
                            <div className="space-y-1.5 mb-3 text-xs">
                              <div className="flex items-center space-x-2 text-gray-800 dark:text-gray-100 font-semibold">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                <span className="truncate">{item.owner_name || 'Driver Not Specified'}</span>
                              </div>

                              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                <Car className="w-3.5 h-3.5 text-gray-400" />
                                <span className="capitalize">{item.vehicle_type ? item.vehicle_type.replace('_', ' ') : 'Registered Vehicle'}</span>
                              </div>
                            </div>

                            {/* Distinct Context Block */}
                            {isOnTravel ? (
                              <div className="p-2.5 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                                <div className="flex items-center justify-between font-bold">
                                  <span>Travel Order:</span>
                                  <span className="font-mono bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded">
                                    {item.travel_order_number || 'TO-DA-OFFICIAL'}
                                  </span>
                                </div>
                                {item.travel_location && (
                                  <div className="flex items-center space-x-1 text-[11px]">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <span className="truncate">Destination: {item.travel_location}</span>
                                  </div>
                                )}
                                {item.travel_end_date && (
                                  <div className="flex items-center space-x-1 text-[11px]">
                                    <Calendar className="w-3 h-3 shrink-0" />
                                    <span>Valid Until: <strong>{new Date(item.travel_end_date).toLocaleDateString()}</strong></span>
                                  </div>
                                )}
                                <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium italic mt-1">
                                  Authorized overnight stay per official DA mandate
                                </p>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-lg bg-red-100/70 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-xs text-red-900 dark:text-red-200 space-y-1">
                                <div className="font-bold flex items-center">
                                  <Clock className="w-3 h-3 mr-1 text-red-700 dark:text-red-400" />
                                  <span>Entered: {item.entry_time ? new Date(item.entry_time).toLocaleString() : 'Recent log'}</span>
                                </div>
                                <p className="text-[11px] text-red-800 dark:text-red-300">
                                  {item.cause_of_overstaying || 'Exceeded 8-hour maximum facility duration without exit scan'}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons Footer */}
                          <div className="pt-3 mt-3 border-t border-gray-200/60 dark:border-gray-700 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-gray-400 font-mono">
                              {item.ticket_number || (item.id ? `REF-${item.id.slice(-6).toUpperCase()}` : '')}
                            </span>

                            <div className="flex items-center space-x-2">
                              {!isOnTravel && item.status !== 'resolved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs bg-white dark:bg-gray-800 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold"
                                  onClick={() => {
                                    setResolvingTicket(item);
                                    setIsResolutionModalOpen(true);
                                  }}
                                >
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                  Resolve
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => {
                                  setSelectedTicketDetail(item);
                                  setIsTicketDetailModalOpen(true);
                                }}
                              >
                                <Info className="w-3.5 h-3.5 mr-1" />
                                Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredExceptions.length === 0 && (
                      <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400 space-y-2">
                        <CheckCircle className="w-10 h-10 mx-auto text-green-500" />
                        <p className="font-semibold text-gray-800 dark:text-gray-200">No active overstaying exceptions found</p>
                        <p className="text-xs text-gray-400">All vehicles currently inside are within their allowable stay duration</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Overstaying Tab */}
          <TabsContent value="overstaying">
            <OverstayingKanbanBoard vehicleStatus={vehicleStatus} />
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
                <CardTitle className="text-green-700">Vehicle Registrations</CardTitle>
                <Dialog open={isAddVehicleModalOpen} onOpenChange={setIsAddVehicleModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Car className="w-4 h-4 mr-2" />
                      Add Vehicle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl text-green-700 flex items-center justify-between">
                        <span className="flex items-center">
                          <Car className="w-5 h-5 mr-2" />
                          Add New Vehicle
                        </span>
                        {newVehicle.plate_number && (
                          <Badge className="bg-green-700 text-white font-mono text-base px-3 py-1 uppercase">
                            {newVehicle.plate_number}
                          </Badge>
                        )}
                      </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreateVehicle} className="space-y-4 mt-2">
                      {/* Live Barcode & Pass Sticker Preview */}
                      <div className="bg-gradient-to-b from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center shadow-sm flex flex-col items-center justify-center">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                          Official DA Gate Pass Sticker Preview
                        </p>
                        <GatePassSticker plateNumber={newVehicle.plate_number || 'SAMPLE-123'} width={290} height={290} />
                      </div>

                      {/* Section 1: Owner's Information */}
                      <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
                        <h4 className="text-sm font-bold text-green-800 flex items-center border-b pb-2">
                          <User className="w-4 h-4 mr-2 text-green-600" />
                          Owner's Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="add_owner_name">Owner Name *</Label>
                            <Input
                              id="add_owner_name"
                              value={newVehicle.owner_name}
                              onChange={(e) => setNewVehicle({...newVehicle, owner_name: e.target.value})}
                              placeholder="e.g. Juan Dela Cruz"
                              className="mt-1"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="add_address">Address</Label>
                            <Input
                              id="add_address"
                              value={newVehicle.address}
                              onChange={(e) => setNewVehicle({...newVehicle, address: e.target.value})}
                              placeholder="Complete Address"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="add_classification">Status Of Employment</Label>
                            <Input
                              id="add_classification"
                              value={newVehicle.classification}
                              onChange={(e) => setNewVehicle({...newVehicle, classification: e.target.value})}
                              placeholder="e.g. Permanent, Contract of Service"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="add_department">Classification</Label>
                            <Input
                              id="add_department"
                              value={newVehicle.department}
                              onChange={(e) => setNewVehicle({...newVehicle, department: e.target.value})}
                              placeholder="e.g. DA RFO 5 Employee/ Staff"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Contact Informations */}
                      <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
                        <h4 className="text-sm font-bold text-green-800 flex items-center border-b pb-2">
                          <Phone className="w-4 h-4 mr-2 text-green-600" />
                          Contact Informations
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="add_email">Email Address</Label>
                            <Input
                              id="add_email"
                              type="email"
                              value={newVehicle.email}
                              onChange={(e) => setNewVehicle({...newVehicle, email: e.target.value})}
                              placeholder="name@email.com"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="add_mobile">Mobile Number</Label>
                            <Input
                              id="add_mobile"
                              value={newVehicle.mobile}
                              onChange={(e) => setNewVehicle({...newVehicle, mobile: e.target.value})}
                              placeholder="09171234567"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Vehicle Informations */}
                      <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
                        <h4 className="text-sm font-bold text-green-800 flex items-center border-b pb-2">
                          <Car className="w-4 h-4 mr-2 text-green-600" />
                          Vehicle Informations
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="add_plate_number">Plate Number *</Label>
                            <Input
                              id="add_plate_number"
                              value={newVehicle.plate_number}
                              onChange={(e) => setNewVehicle({...newVehicle, plate_number: e.target.value.toUpperCase()})}
                              placeholder="ABC-1234"
                              className="font-mono mt-1 uppercase"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="add_vehicle_category">Vehicle Category</Label>
                            <Select 
                              value={newVehicle.vehicle_category} 
                              onValueChange={(value) => setNewVehicle({...newVehicle, vehicle_category: value})}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Car">Car</SelectItem>
                                <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                                <SelectItem value="SUV">SUV</SelectItem>
                                <SelectItem value="Tricycle">Tricycle</SelectItem>
                                <SelectItem value="Van">Van</SelectItem>
                                <SelectItem value="Truck">Truck</SelectItem>
                              </SelectContent>
                            </Select>
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
                                <SelectItem value="private">Private Vehicle</SelectItem>
                                <SelectItem value="da_government">DA Government Vehicle</SelectItem>
                                <SelectItem value="government">Government Vehicle</SelectItem>
                                <SelectItem value="public">Public Vehicle</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="add_brand">Brand</Label>
                            <Input
                              id="add_brand"
                              value={newVehicle.brand}
                              onChange={(e) => setNewVehicle({...newVehicle, brand: e.target.value})}
                              placeholder="e.g. Toyota, Honda, Yamaha"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="add_color">Color</Label>
                            <Input
                              id="add_color"
                              value={newVehicle.color}
                              onChange={(e) => setNewVehicle({...newVehicle, color: e.target.value})}
                              placeholder="e.g. White, Black, Red"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddVehicleModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700">
                          Save Vehicle
                        </Button>
                      </div>
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
                            {vehicle.vehicle_type === 'private' ? 'Private Vehicle' : (vehicle.vehicle_type === 'da_government' ? 'DA Government' : vehicle.vehicle_type?.replace('_', ' '))}
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
                          <div className="truncate" title={formatTitleCase(vehicle.owner_name)}>
                            {formatTitleCase(vehicle.owner_name)}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-2 py-2 truncate text-xs">
                          <div className="truncate" title={vehicle.classification || 'N/A'}>
                            {vehicle.classification || 'N/A'}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-2 py-2 truncate text-xs">
                          <div className="truncate" title={vehicle.department || 'N/A'}>
                            {vehicle.department || 'N/A'}
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
                    <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-xl text-green-700 flex items-center justify-between">
                          <span className="flex items-center">
                            <Car className="w-5 h-5 mr-2" />
                            Vehicle Pass & Details
                          </span>
                          <Badge className="bg-green-700 text-white font-mono text-base px-3 py-1">
                            {selectedManageVehicle.plate_number}
                          </Badge>
                        </DialogTitle>
                      </DialogHeader>

                      <Tabs value={activeVehicleModalTab} onValueChange={setActiveVehicleModalTab} className="w-full mt-2">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                          <TabsTrigger value="view" className="flex items-center">
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </TabsTrigger>
                          <TabsTrigger value="edit" className="flex items-center">
                            <Edit className="w-4 h-4 mr-2" /> Edit Details
                          </TabsTrigger>
                        </TabsList>

                        {/* View Details Tab */}
                        <TabsContent value="view" className="space-y-5">
                          {/* Official DA Gate Pass Sticker Badge with Dynamic Barcode */}
                          <div className="bg-gradient-to-b from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center shadow-sm flex flex-col items-center justify-center">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                              Official DA Gate Pass Sticker
                            </p>
                            <GatePassSticker plateNumber={selectedManageVehicle.plate_number} width={310} height={310} />
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm"
                                onClick={() => BarcodeGenerator.printSticker(selectedManageVehicle.plate_number)}
                              >
                                <Printer className="w-3.5 h-3.5 mr-1.5" />
                                Print Sticker
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-300 text-gray-700 font-medium"
                                onClick={() => BarcodeGenerator.downloadStickerPDF(selectedManageVehicle.plate_number)}
                              >
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                Download PDF
                              </Button>
                            </div>
                          </div>

                          {/* Section 1: Owner's Information */}
                          <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
                            <h4 className="text-sm font-bold text-green-800 flex items-center border-b pb-2">
                              <User className="w-4 h-4 mr-2 text-green-600" />
                              Owner's Information
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Owner Name</p>
                                <p className="font-semibold text-gray-900">{formatTitleCase(selectedManageVehicle.owner_name)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Address</p>
                                <p className="font-medium text-gray-800 truncate" title={selectedManageVehicle.address || 'DA Region V, Pili, Camarines Sur'}>
                                  {selectedManageVehicle.address || 'DA Region V, Pili, Camarines Sur'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Status Of Employment</p>
                                <Badge variant="outline" className="mt-0.5 border-green-600 text-green-700 bg-green-50">
                                  {selectedManageVehicle.classification || 'N/A'}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Classification</p>
                                <p className="font-medium text-gray-800">{selectedManageVehicle.department || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Section 2: Contact Informations */}
                          <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
                            <h4 className="text-sm font-bold text-green-800 flex items-center border-b pb-2">
                              <Phone className="w-4 h-4 mr-2 text-green-600" />
                              Contact Informations
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Email Address</p>
                                <p className="font-medium text-gray-800 truncate" title={selectedManageVehicle.email || 'N/A'}>
                                  {selectedManageVehicle.email || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Mobile Number</p>
                                <p className="font-medium text-gray-800">
                                  {selectedManageVehicle.mobile || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Section 3: Vehicle Informations */}
                          <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
                            <h4 className="text-sm font-bold text-green-800 flex items-center border-b pb-2">
                              <Car className="w-4 h-4 mr-2 text-green-600" />
                              Vehicle Informations
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Vehicle Category</p>
                                <Badge variant="secondary" className="mt-0.5 capitalize">
                                  {selectedManageVehicle.vehicle_category || (selectedManageVehicle.brand && selectedManageVehicle.brand.toLowerCase().includes('yamaha') ? 'Motorcycle' : 'Car')}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Vehicle Type</p>
                                <p className="font-medium text-gray-800 capitalize">
                                  {selectedManageVehicle.vehicle_type === 'private' ? 'Private Vehicle' : (selectedManageVehicle.vehicle_type === 'da_government' ? 'DA Government Vehicle' : selectedManageVehicle.vehicle_type?.replace('_', ' '))}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Brand</p>
                                <p className="font-medium text-gray-800 capitalize">{selectedManageVehicle.brand || 'Not Specified'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase">Color</p>
                                <p className="font-medium text-gray-800 capitalize">{selectedManageVehicle.color || 'Not Specified'}</p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        {/* Edit Details Tab */}
                        <TabsContent value="edit">
                          <form onSubmit={handleUpdateVehicleSubmit} className="space-y-4">
                            {/* Owner Info Section */}
                            <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
                              <h4 className="text-sm font-bold text-green-800 flex items-center border-b pb-2">
                                <User className="w-4 h-4 mr-2 text-green-600" />
                                Owner's Information
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="edit_owner_name">Owner Name *</Label>
                                  <Input 
                                    id="edit_owner_name"
                                    value={editVehicleData.owner_name}
                                    onChange={(e) => setEditVehicleData({...editVehicleData, owner_name: e.target.value})}
                                    placeholder="e.g. Juan De La Cruz"
                                    className="mt-1"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit_address">Address</Label>
                                  <Input 
                                    id="edit_address"
                                    value={editVehicleData.address}
                                    onChange={(e) => setEditVehicleData({...editVehicleData, address: e.target.value})}
                                    placeholder="Complete Address"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit_classification">Status Of Employment</Label>
                                  <Input 
                                    id="edit_classification"
                                    value={editVehicleData.classification}
                                    onChange={(e) => setEditVehicleData({...editVehicleData, classification: e.target.value})}
                                    placeholder="Permanent / Contract of Service / Job Order"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit_department">Classification</Label>
                                  <Input 
                                    id="edit_department"
                                    value={editVehicleData.department}
                                    onChange={(e) => setEditVehicleData({...editVehicleData, department: e.target.value})}
                                    placeholder="DA RFO 5 Employee/ Staff"
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Contact Info Section */}
                            <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
                              <h4 className="text-sm font-bold text-green-800 flex items-center border-b pb-2">
                                <Phone className="w-4 h-4 mr-2 text-green-600" />
                                Contact Informations
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="edit_email">Email Address</Label>
                                  <Input 
                                    id="edit_email"
                                    type="email"
                                    value={editVehicleData.email}
                                    onChange={(e) => setEditVehicleData({...editVehicleData, email: e.target.value})}
                                    placeholder="name@email.com"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit_mobile">Mobile Number</Label>
                                  <Input 
                                    id="edit_mobile"
                                    value={editVehicleData.mobile}
                                    onChange={(e) => setEditVehicleData({...editVehicleData, mobile: e.target.value})}
                                    placeholder="09171234567"
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Vehicle Info Section */}
                            <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
                              <h4 className="text-sm font-bold text-green-800 flex items-center border-b pb-2">
                                <Car className="w-4 h-4 mr-2 text-green-600" />
                                Vehicle Informations
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="edit_vehicle_category">Vehicle Category</Label>
                                  <Select 
                                    value={editVehicleData.vehicle_category}
                                    onValueChange={(val) => setEditVehicleData({...editVehicleData, vehicle_category: val})}
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Car">Car</SelectItem>
                                      <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                                      <SelectItem value="SUV">SUV</SelectItem>
                                      <SelectItem value="Tricycle">Tricycle</SelectItem>
                                      <SelectItem value="Van">Van</SelectItem>
                                      <SelectItem value="Truck">Truck</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="edit_vehicle_type">Vehicle Type</Label>
                                  <Select 
                                    value={editVehicleData.vehicle_type}
                                    onValueChange={(val) => setEditVehicleData({...editVehicleData, vehicle_type: val})}
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="private">Private Vehicle</SelectItem>
                                      <SelectItem value="da_government">DA Government Vehicle</SelectItem>
                                      <SelectItem value="government">Government Vehicle</SelectItem>
                                      <SelectItem value="public">Public Vehicle</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="edit_brand">Brand</Label>
                                  <Input 
                                    id="edit_brand"
                                    value={editVehicleData.brand}
                                    onChange={(e) => setEditVehicleData({...editVehicleData, brand: e.target.value})}
                                    placeholder="e.g. Toyota, Honda, Yamaha"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit_color">Color</Label>
                                  <Input 
                                    id="edit_color"
                                    value={editVehicleData.color}
                                    onChange={(e) => setEditVehicleData({...editVehicleData, color: e.target.value})}
                                    placeholder="e.g. White, Black, Red"
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-2">
                              <Button type="button" variant="outline" onClick={() => setIsManageVehicleModalOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSavingVehicle}>
                                {isSavingVehicle ? 'Saving...' : 'Save Changes'}
                              </Button>
                            </div>
                          </form>
                        </TabsContent>
                      </Tabs>
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
                        <FileText className="w-5 h-5 text-purple-600 mr-2" />
                        <h4 className="font-medium">Barcode Generation</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Generates printable 1D barcodes with PDF download capability.
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
                        <Camera className="w-5 h-5 text-green-600 mr-2" />
                        <h4 className="font-medium">Camera & OCR</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Automatic license data extraction from photos with manual fallback option.
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
        </div>
      </div>
    </div>

    {/* Resolution Modal */}
    <ResolutionModal 
      isOpen={isResolutionModalOpen}
      onClose={() => {
        setIsResolutionModalOpen(false);
        setResolvingTicket(null);
      }}
      onSave={handleResolveTicketSave}
      ticket={resolvingTicket}
    />

    {/* Ticket Detail Modal */}
    <TicketDetailModal
      isOpen={isTicketDetailModalOpen}
      onClose={() => {
        setIsTicketDetailModalOpen(false);
        setSelectedTicketDetail(null);
      }}
      ticket={selectedTicketDetail}
      onUpdateTicket={(updated) => {
        setTickets(tickets.map(t => t.id === updated.id ? updated : t));
        fetchDashboardData();
      }}
    />

    {/* Vehicle Details Modal */}
    <Dialog open={isVehicleDetailModalOpen} onOpenChange={setIsVehicleDetailModalOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-4">
            <span>Vehicle Inside Details</span>
            <span className="font-mono font-bold text-sm bg-green-800 text-white px-2.5 py-0.5 rounded">
              {selectedVehicleDetail?.plate_number}
            </span>
          </DialogTitle>
        </DialogHeader>

        {selectedVehicleDetail && (
          <div className="space-y-4 py-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge className={selectedVehicleDetail.registration_type === 'visitor' ? 'bg-blue-600' : 'bg-green-700'}>
                {selectedVehicleDetail.registration_type === 'visitor' ? 'VISITOR' : 'DA / PERMANENT'}
              </Badge>
              {selectedVehicleDetail.classification && (
                <Badge variant="outline">{selectedVehicleDetail.classification}</Badge>
              )}
              {selectedVehicleDetail.vehicle_type && (
                <Badge variant="secondary" className="capitalize">{selectedVehicleDetail.vehicle_type.replace('_', ' ')}</Badge>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2 border">
              <div className="flex justify-between">
                <span className="text-gray-500">Driver / Owner:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedVehicleDetail.owner_name || 'Not on record'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Make / Color:</span>
                <span>{(selectedVehicleDetail.brand || selectedVehicleDetail.color) ? `${selectedVehicleDetail.brand || 'Vehicle'} • ${selectedVehicleDetail.color || ''}`.trim() : 'N/A'}</span>
              </div>
              {selectedVehicleDetail.department && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{selectedVehicleDetail.registration_type === 'visitor' ? 'Visiting Office:' : 'Department:'}</span>
                  <span className="font-medium text-right">{selectedVehicleDetail.department}</span>
                </div>
              )}
              {selectedVehicleDetail.purpose_of_visit && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Purpose of Visit:</span>
                  <span className="font-medium text-right">{selectedVehicleDetail.purpose_of_visit}</span>
                </div>
              )}
            </div>

            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 space-y-1.5 border border-green-200 dark:border-green-800">
              <div className="flex justify-between text-xs text-green-900 dark:text-green-300">
                <span>Entry Timestamp:</span>
                <span>{selectedVehicleDetail.entry_time ? new Date(selectedVehicleDetail.entry_time).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between text-xs text-green-900 dark:text-green-300 font-bold">
                <span>Time Elapsed:</span>
                <span>{formatDuration(selectedVehicleDetail.duration_hours)}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  handleIssueTicket(selectedVehicleDetail.plate_number);
                  setIsVehicleDetailModalOpen(false);
                }}
              >
                <Ticket className="w-3.5 h-3.5 mr-1" />
                Issue Ticket
              </Button>
              <Button variant="default" onClick={() => setIsVehicleDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </Tabs>
  );
};

export default AdminDashboard;
