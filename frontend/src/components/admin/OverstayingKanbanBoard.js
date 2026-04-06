import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../services/constants';
import TicketCard from './TicketCard';
import ResolutionModal from './ResolutionModal';
import TravelModal from './TravelModal';
import { AlertTriangle, Filter, Plus, Plane, Calendar as CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

const OverstayingKanbanBoard = ({ vehicleStatus = [] }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [tickets, setTickets] = useState({
    overstaying: [],
    on_travel: [],
    under_investigation: [],
    resolved: []
  });
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');

  const matchesFilter = (ticket) => {
    // 1. Vehicle Type
    if (vehicleTypeFilter !== 'all') {
      if (vehicleTypeFilter === 'visitor' && ticket.vehicle_type !== 'visitor') return false;
      if (vehicleTypeFilter === 'employee' && ticket.vehicle_type !== 'da_government') return false;
    }
    
    // 2. Search Query (Plate, Owner Name, Ticket ID)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const plate = (ticket.plate_number || '').toLowerCase();
      const owner = (ticket.owner_name || '').toLowerCase();
      const ticketIdStr = ticket.ticket_number ? ticket.ticket_number.toLowerCase() : `ovr-${String(ticket.id).slice(-6).toLowerCase()}`;
      
      if (!plate.includes(query) && !owner.includes(query) && !ticketIdStr.includes(query)) {
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (!filterType || filterType === 'custom') return;
    
    if (filterType === 'all') {
      setDateFilter({ start: '', end: '' });
      return;
    }

    const end = new Date();
    const start = new Date();
    
    if (filterType === '7_days') start.setDate(start.getDate() - 7);
    if (filterType === '14_days') start.setDate(start.getDate() - 14);
    if (filterType === '30_days') start.setDate(start.getDate() - 30);
    
    setDateFilter({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    });
  }, [filterType]);
  
  const [pendingResolution, setPendingResolution] = useState(null);
  const [pendingTravel, setPendingTravel] = useState(null);
  
  // Create Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPlate, setSelectedPlate] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);
  
  const fetchTickets = async () => {
    try {
      let url = `${API}/tickets`;
      if (dateFilter.start && dateFilter.end) {
        url += `?start_date=${encodeURIComponent(new Date(dateFilter.start).toISOString())}&end_date=${encodeURIComponent(new Date(dateFilter.end).toISOString())}`;
      }
      const res = await axios.get(url);
      const data = res.data;
      
      setTickets({
        overstaying: data.filter(t => t.status === 'overstaying'),
        on_travel: data.filter(t => t.status === 'on_travel'),
        under_investigation: data.filter(t => t.status === 'under_investigation'),
        resolved: data.filter(t => t.status === 'resolved'),
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 10000);
    return () => clearInterval(interval);
  }, [dateFilter]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Moving logically in UI for immediate feedback
    const startColumn = [...tickets[source.droppableId]];
    const finishColumn = [...tickets[destination.droppableId]];
    
    const [movedTicket] = startColumn.splice(source.index, 1);
    const newStatus = destination.droppableId;
    
    if (newStatus === 'resolved') {
       // Open modal, intercept drop
       setPendingResolution({ ticket: movedTicket, originalSource: source.droppableId });
       return;
    }
    
    if (newStatus === 'on_travel') {
       // Open modal, intercept drop
       setPendingTravel({ ticket: movedTicket, originalSource: source.droppableId });
       return;
    }
    
    movedTicket.status = newStatus;
    finishColumn.splice(destination.index, 0, movedTicket);
    
    setTickets({
      ...tickets,
      [source.droppableId]: startColumn,
      [destination.droppableId]: finishColumn,
    });
    
    try {
      await axios.put(`${API}/tickets/${draggableId}/status`, { status: newStatus });
      toast({ title: 'Status Updated', description: `Ticket moved to ${newStatus.replace('_', ' ')}` });
    } catch (err) {
      fetchTickets(); // revert on failure
      toast({ title: 'Error', variant: 'destructive', description: "Failed to update status." });
    }
  };

  const handleResolutionSave = async (note) => {
    if (!pendingResolution) return;
    
    const { ticket, originalSource } = pendingResolution;
    
    // Optimistic UI
    const startColumn = tickets[originalSource].filter(t => t.id !== ticket.id);
    const finishColumn = [{ ...ticket, status: 'resolved', resolution_note: note, resolved_by: user.username }, ...tickets.resolved];
    
    setTickets({
      ...tickets,
      [originalSource]: startColumn,
      resolved: finishColumn
    });
    setPendingResolution(null);
    
    try {
      await axios.put(`${API}/tickets/${ticket.id}/status`, { 
        status: 'resolved',
        resolution_note: note,
        resolved_by: user.username
      });
      toast({ title: 'Ticket Resolved', description: 'Incident properly recorded.' });
    } catch (err) {
      fetchTickets();
      toast({ title: 'Error', variant: 'destructive', description: "Failed to resolve ticket." });
    }
  };

  const handleCreateTicket = async () => {
    if (!selectedPlate) return;
    setCreatingTicket(true);
    try {
      await axios.post(`${API}/tickets`, { plate_number: selectedPlate });
      toast({ title: 'Ticket Created', description: `Overstaying ticket created for ${selectedPlate}` });
      setCreateModalOpen(false);
      setSelectedPlate('');
      fetchTickets();
    } catch (err) {
      toast({ 
        title: 'Creation Failed', 
        variant: 'destructive', 
        description: err.response?.data?.detail || "Failed to create ticket" 
      });
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleTravelSave = async (travelData) => {
    if (!pendingTravel) return;
    
    const { ticket, originalSource } = pendingTravel;
    
    const startColumn = tickets[originalSource].filter(t => t.id !== ticket.id);
    const finishColumn = [{ ...ticket, status: 'on_travel', ...travelData }, ...tickets.on_travel];
    
    setTickets({
      ...tickets,
      [originalSource]: startColumn,
      on_travel: finishColumn
    });
    setPendingTravel(null);
    
    try {
      await axios.put(`${API}/tickets/${ticket.id}/status`, { 
        status: 'on_travel',
        ...travelData
      });
      toast({ title: 'Vehicle Flagged On Travel', description: 'Vehicle properly documented and excused for duration of travel.' });
    } catch (err) {
      fetchTickets();
      toast({ title: 'Error', variant: 'destructive', description: "Failed to update ticket status." });
    }
  };

  // Vehicles currently inside that do NOT have an active ticket
  const activeTicketPlates = [...tickets.overstaying, ...tickets.on_travel, ...tickets.under_investigation].map(t => t.plate_number);
  const availableVehicles = vehicleStatus.filter(v => !activeTicketPlates.includes(v.plate_number));

  return (
    <div className="relative flex flex-col h-full space-y-4">
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-3 mb-2 px-1">
        
        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search plate, owner, ID..."
              className="pl-9 h-9 text-sm w-[200px] sm:w-[220px] border-gray-300 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Type Toggle */}
          <ToggleGroup 
            type="single" 
            value={vehicleTypeFilter} 
            onValueChange={(val) => val && setVehicleTypeFilter(val)}
            className="bg-white border rounded-md shadow-sm h-9 p-1"
          >
            <ToggleGroupItem value="all" className="h-7 text-xs px-3">All Vehicles</ToggleGroupItem>
            <ToggleGroupItem value="visitor" className="h-7 text-xs px-3">Visitors</ToggleGroupItem>
            <ToggleGroupItem value="employee" className="h-7 text-xs px-3">Employees</ToggleGroupItem>
          </ToggleGroup>

          {/* Date Filter */}
          <div className="flex items-center text-sm text-gray-600 bg-white px-1.5 py-1 rounded-md border shadow-sm h-9">
            <Filter className="w-4 h-4 text-gray-400 mx-1.5 hidden sm:block" />
            <span className="font-medium mr-2 whitespace-nowrap hidden sm:inline text-gray-500">Resolved Date:</span>
            
            <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-7 text-xs w-[130px] border-none shadow-none focus:ring-0 bg-transparent px-2">
                    <SelectValue placeholder="Select Range" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Available</SelectItem>
                    <SelectItem value="7_days">Last 7 Days</SelectItem>
                    <SelectItem value="14_days">Last 14 Days</SelectItem>
                    <SelectItem value="30_days">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
            </Select>

            {filterType === 'custom' && (
              <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2 pl-2 border-l ml-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`h-7 px-2 text-xs w-[110px] justify-start font-normal border-gray-200 ${!dateFilter.start && 'text-gray-500'}`}>
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateFilter.start ? format(new Date(dateFilter.start), "PP") : <span>Start Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFilter.start ? new Date(dateFilter.start.replace(/-/g, '/')) : undefined}
                      onSelect={(d) => setDateFilter({...dateFilter, start: d ? d.toLocaleDateString('en-CA') : ''})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-gray-400">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`h-7 px-2 text-xs w-[110px] justify-start font-normal border-gray-200 ${!dateFilter.end && 'text-gray-500'}`}>
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateFilter.end ? format(new Date(dateFilter.end), "PP") : <span>End Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFilter.end ? new Date(dateFilter.end.replace(/-/g, '/')) : undefined}
                      onSelect={(d) => setDateFilter({...dateFilter, end: d ? d.toLocaleDateString('en-CA') : ''})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            
            {(dateFilter.start || dateFilter.end || filterType) && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs ml-1 hover:bg-gray-100 text-gray-500" onClick={() => { setFilterType(''); setDateFilter({start:'', end:''}); }}>Clear</Button>
            )}
          </div>
        </div>

        {/* Action Button Removed */}
      </div>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full items-start overflow-x-auto pb-4">
          
          {/* Overstaying Column */}
          <Droppable droppableId="overstaying">
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className={`bg-gray-100 rounded-lg p-3 min-w-[280px] min-h-[500px] border-t-4 border-red-500 transition-colors ${snapshot.isDraggingOver ? 'bg-red-50' : ''}`}
              >
                <h3 className="font-bold text-gray-700 flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                  <span className="flex items-center"><AlertTriangle className="w-4 h-4 text-red-500 mr-2"/> Overstaying</span>
                  <Badge variant="secondary" className="bg-gray-200">{tickets.overstaying.length}</Badge>
                </h3>
                {tickets.overstaying.map((t, i) => <TicketCard key={t.id} item={t} index={i} isDimmed={!matchesFilter(t)} />)}
                {provided.placeholder}
                
                <Button 
                    variant="ghost" 
                    className="w-full mt-2 text-gray-500 hover:text-red-700 hover:bg-red-50 border-dashed border-2 border-gray-300 hover:border-red-300 transition-colors h-12 flex items-center justify-center font-medium"
                    onClick={() => setCreateModalOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Overstaying Vehicle
                </Button>
              </div>
            )}
          </Droppable>



          {/* Under Investigation Column */}
          <Droppable droppableId="under_investigation">
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className={`bg-gray-100/90 rounded-lg p-3 min-h-[500px] border-t-4 border-yellow-500 transition-colors ${snapshot.isDraggingOver ? 'bg-yellow-50' : ''}`}
              >
                <h3 className="font-bold text-gray-700 flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                  <span>Under Investigation</span>
                  <Badge variant="secondary" className="bg-gray-200">{tickets.under_investigation.length}</Badge>
                </h3>
                {tickets.under_investigation.map((t, i) => <TicketCard key={t.id} item={t} index={i} isDimmed={!matchesFilter(t)} />)}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Resolved Column */}
          <Droppable droppableId="resolved">
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className={`bg-gray-100/60 rounded-lg p-3 min-h-[500px] border-t-4 border-green-500 transition-colors ${snapshot.isDraggingOver ? 'bg-green-50' : ''}`}
              >
                <h3 className="font-bold text-gray-700 flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                  <span>Resolved</span>
                  <Badge variant="secondary" className="bg-gray-200">{tickets.resolved.length}</Badge>
                </h3>
                {tickets.resolved.map((t, i) => <TicketCard key={t.id} item={t} index={i} isDimmed={!matchesFilter(t)} />)}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* On Travel Column */}
          <Droppable droppableId="on_travel">
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className={`bg-gray-100/90 rounded-lg p-3 min-w-[280px] min-h-[500px] border-t-4 border-blue-500 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
              >
                <h3 className="font-bold text-gray-700 flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                  <span className="flex items-center"><Plane className="w-4 h-4 text-blue-500 mr-2"/> On Travel</span>
                  <Badge variant="secondary" className="bg-gray-200">{tickets.on_travel.length}</Badge>
                </h3>
                {tickets.on_travel.map((t, i) => <TicketCard key={t.id} item={t} index={i} isDimmed={!matchesFilter(t)} />)}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

        </div>
      </DragDropContext>

      {pendingResolution && (
        <ResolutionModal 
          isOpen={true}
          onClose={() => setPendingResolution(null)}
          onSave={handleResolutionSave}
          ticket={pendingResolution.ticket}
        />
      )}

      {pendingTravel && (
        <TravelModal
          isOpen={true}
          onClose={() => setPendingTravel(null)}
          onSave={handleTravelSave}
          ticket={pendingTravel.ticket}
        />
      )}
      
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manually Flag Overstaying Vehicle</DialogTitle>
            <DialogDescription className="sr-only">Form to select and flag a currently inside vehicle as overstaying.</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-gray-600 space-y-4">
            <p>Select a vehicle currently inside the premises to flag it as overstaying and create an investigation ticket.</p>
            <div className="flex flex-col space-y-2">
                <label className="font-medium text-black">Vehicle inside premises:</label>
                <Select value={selectedPlate} onValueChange={setSelectedPlate}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select plate number" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableVehicles.length > 0 ? (
                            availableVehicles.map(v => (
                                <SelectItem key={v.plate_number} value={v.plate_number}>
                                    {v.plate_number} - {new Date(v.entry_time).toLocaleTimeString()} ({v.duration_hours?.toFixed(1) || 0}h)
                                </SelectItem>
                            ))
                        ) : (
                            <SelectItem value="none" disabled>No available vehicles</SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button 
                onClick={handleCreateTicket} 
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                disabled={!selectedPlate || creatingTicket || selectedPlate === 'none'}
            >
                {creatingTicket ? 'Creating...' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OverstayingKanbanBoard;
