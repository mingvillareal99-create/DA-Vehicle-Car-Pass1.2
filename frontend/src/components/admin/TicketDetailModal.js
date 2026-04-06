import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Clock, User, Car, Plane, Star, Check, MessageSquare, Send } from "lucide-react";
import axios from "axios";
import { API } from "../../services/constants";

const TicketDetailModal = ({ isOpen, onClose, ticket, onToggleImportant, onUpdateTicket, onQuickResolve }) => {
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ticket) return null;

  const entryTime = new Date(ticket.entry_time);
  const now = ticket.resolved_at ? new Date(ticket.resolved_at) : new Date();
  const diffHours = (now - entryTime) / (1000 * 60 * 60);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API}/tickets/${ticket.id}/notes`, { text: newNote });
      setNewNote('');
      if (onUpdateTicket) {
        const updatedTicket = { ...ticket, notes: [...(ticket.notes || []), res.data.note] };
        onUpdateTicket(updatedTicket);
      }
    } catch (err) {
      console.error('Failed to add note', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center pr-6">
            <span className="flex items-center space-x-3">
              <span>Ticket Details</span>
              <span className="font-mono text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">
                {ticket.ticket_number || `OVR-${ticket.id.slice(-6).toUpperCase()}`}
              </span>
            </span>
            <Badge variant={ticket.vehicle_type === 'visitor' ? 'outline' : 'default'} className={
              ticket.status === 'overstaying' ? 'bg-red-600' : ''
            }>
              {ticket.plate_number}
            </Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">Detailed view of the generated ticket including owner and vehicle information.</DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Overstaying Status & Duration */}
          <div className="bg-gray-50 border p-3 rounded-lg overflow-hidden relative">
            {ticket.status === 'overstaying' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
            {ticket.status === 'on_travel' && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>}
            {ticket.status === 'under_investigation' && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>}
            {ticket.status === 'resolved' && <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>}
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center ml-2">
              <Clock className="w-4 h-4 mr-2" /> Duration Details
            </h4>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 pl-2 text-sm">
              <span className="text-gray-500">Entry Time:</span>
              <span className="font-medium text-right">{entryTime.toLocaleString()}</span>
              
              <span className="text-gray-500">Elapsed Time:</span>
              <span className="font-medium text-right">
                 {diffHours > 24 ? `${Math.floor(diffHours/24)}d ${Math.floor(diffHours%24)}h` : `${Math.floor(diffHours)}h ${Math.floor((diffHours%1)*60)}m`}
              </span>
              
              <span className="text-gray-500">Ticket Status:</span>
              <span className={`font-medium text-right capitalize ${ticket.status === 'overstaying' ? 'text-red-600' : ticket.status === 'resolved' ? 'text-green-600' : ticket.status === 'on_travel' ? 'text-blue-600' : 'text-yellow-600'}`}>
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
            {ticket.cause_of_overstaying && (
                <div className="mt-3 text-xs text-red-800 bg-red-100 p-2 rounded ml-2 font-semibold">
                  <span>Overstay Flag: {ticket.cause_of_overstaying}</span>
                </div>
            )}
            {ticket.status !== 'resolved' && ticket.status !== 'on_travel' && !ticket.cause_of_overstaying && (
              <div className="mt-3 text-xs text-red-800 bg-red-100/50 p-2 rounded ml-2 border border-red-100">
                <span className="font-semibold block mb-1">Flag Info:</span>
                This vehicle has exceeded the allowed time limit based on its parking or visitation rules and is currently flagged as {ticket.status.replace('_', ' ')}.
              </div>
            )}
            {ticket.status === 'resolved' && (
              <div className="mt-3 bg-green-50/50 p-2 rounded border border-green-200 ml-2">
                <p className="text-xs font-semibold text-green-800 mb-1">Resolution Note:</p>
                <p className="text-sm text-green-900 border-l-2 border-green-400 pl-2 py-1">{ticket.resolution_note}</p>
                <p className="text-xs text-gray-500 mt-2 text-right">Resolved By {ticket.resolved_by}</p>
              </div>
            )}
          </div>

          {ticket.travel_order_number && (
            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg overflow-hidden relative shadow-sm">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center ml-2">
                  <Plane className="w-4 h-4 mr-2" /> Travel Details
                </h4>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 pl-2 text-sm">
                  <span className="text-gray-500">Order/Pass Number:</span>
                  <span className="font-medium text-right">{ticket.travel_order_number}</span>
                  <span className="text-gray-500">Location:</span>
                  <span className="font-medium text-right truncate" title={ticket.travel_location}>{ticket.travel_location}</span>
                  <span className="text-gray-500">Expected Return:</span>
                  <span className="font-medium text-right font-bold text-blue-700">
                    {new Date(ticket.travel_end_date).toLocaleDateString()}
                  </span>
                </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
              {/* Driver Information */}
              <div className="border p-3 rounded-lg overflow-hidden relative shadow-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-100"></div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center pt-1">
                  <User className="w-4 h-4 mr-2" /> Owner Information
                </h4>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex flex-col">
                      <span className="text-gray-400">Full Name</span>
                      <span className="font-medium text-sm truncate" title={ticket.owner_name || 'N/A'}>{ticket.owner_name || 'N/A'}</span>
                  </div>
                  
                  <div className="flex flex-col">
                      <span className="text-gray-400">License Number</span>
                      <span className="font-medium">{ticket.license_number || 'N/A'}</span>
                  </div>

                  <div className="flex flex-col">
                      <span className="text-gray-400">Gender</span>
                      <span className="font-medium capitalize">{ticket.gender || 'N/A'}</span>
                  </div>

                  <div className="flex flex-col">
                      <span className="text-gray-400">Address</span>
                      <span className="font-medium truncate" title={ticket.address || 'N/A'}>{ticket.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="border p-3 rounded-lg overflow-hidden relative shadow-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-purple-100"></div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center pt-1">
                  <Car className="w-4 h-4 mr-2" /> Vehicle Information
                </h4>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex flex-col">
                      <span className="text-gray-400">Plate Number</span>
                      <span className="font-medium text-sm font-mono tracking-wider">{ticket.plate_number || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-gray-400">Vehicle Type</span>
                      <span className="font-medium capitalize">{(ticket.vehicle_type || 'N/A').replace('_', ' ')}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-gray-400">Purpose of Visit</span>
                      <span className="font-medium">{ticket.purpose_of_visit || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Case Notes Timeline */}
            <div className="mt-4 pt-4 border-t border-gray-100">
               <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                 <MessageSquare className="w-4 h-4 mr-2" /> Case Notes & Activity
               </h4>
               
               <div className="space-y-3 mb-4 max-h-[250px] overflow-y-auto pr-2">
                 {ticket.notes && ticket.notes.length > 0 ? (
                   ticket.notes.map((note, index) => (
                     <div key={note.id || index} className="bg-gray-50 border rounded-lg p-3 relative">
                       <div className="flex justify-between items-start mb-1">
                         <span className="font-semibold text-xs text-gray-700">{note.author}</span>
                         <span className="text-[10px] text-gray-400 font-mono">{new Date(note.timestamp).toLocaleString()}</span>
                       </div>
                       <p className="text-sm text-gray-600 break-words">{note.text}</p>
                     </div>
                   ))
                 ) : (
                   <div className="text-center py-6 text-gray-400 text-sm border border-dashed rounded-lg">
                     No notes logged yet.
                   </div>
                 )}
               </div>
               
               {ticket.status !== 'resolved' && (
                 <div className="flex gap-2 items-end bg-white border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 rounded-2xl p-1 shadow-sm transition-all duration-200">
                   <Textarea 
                     value={newNote}
                     onChange={(e) => setNewNote(e.target.value)}
                     placeholder="Add a case note (e.g., Called owner...)"
                     className="text-sm border-0 focus-visible:ring-0 resize-none min-h-[40px] px-3 py-2.5 bg-transparent w-full shadow-none"
                     rows={1}
                   />
                   <Button 
                     onClick={handleAddNote} 
                     disabled={isSubmitting || !newNote.trim()}
                     className="h-9 w-9 rounded-xl p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200 group flex-shrink-0 disabled:bg-gray-200 disabled:text-gray-400 mb-0.5 mr-0.5"
                   >
                     {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                     ) : (
                        <Send className="w-4 h-4 ml-0.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                     )}
                   </Button>
                 </div>
               )}
            </div>
           </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center sm:space-x-2 w-full mt-4 gap-2 sm:gap-0">
          <div className="flex space-x-2 w-full sm:w-auto">
            {onToggleImportant && (
               <Button 
                  variant={ticket.is_important ? "secondary" : "outline"}
                  onClick={() => onToggleImportant(ticket)} 
                  className={`flex-1 sm:flex-none ${ticket.is_important ? "bg-red-50 text-red-600 hover:bg-red-100" : ""}`}
               >
                 <Star className={`w-4 h-4 mr-2 ${ticket.is_important ? 'fill-current' : ''}`} />
                 {ticket.is_important ? "Unpin" : "Pin"}
               </Button>
            )}
            {ticket.status !== 'resolved' && onQuickResolve && (
               <Button 
                  variant="outline"
                  onClick={() => { onQuickResolve(ticket); onClose(); }} 
                  className="flex-1 sm:flex-none text-green-600 hover:bg-green-50 border-green-200"
               >
                 <Check className="w-4 h-4 mr-2" /> Resolve
               </Button>
            )}
          </div>
          <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailModal;
