import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Clock, User, Car } from "lucide-react";
import TicketDetailModal from './TicketDetailModal';

const TicketCard = ({ item, index, isDimmed }) => {
  const [modalOpen, setModalOpen] = useState(false);
  
  // Calculate duration
  const entryTime = new Date(item.entry_time);
  const now = new Date();
  const diffHours = (now - entryTime) / (1000 * 60 * 60);
  
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-3 last:mb-0 transition-transform ${snapshot.isDragging ? 'rotate-2 scale-105 z-50 opacity-90' : ''} ${isDimmed ? 'opacity-30 grayscale saturate-0' : ''}`}
        >
          <Card 
            onClick={() => setModalOpen(true)}
            className={`border shadow-sm hover:shadow-md hover:ring-2 ring-black/5 transition-all cursor-pointer ${
            item.status === 'overstaying' ? 'border-red-200 bg-red-50/50' : 
            item.status === 'on_travel' ? 'border-blue-200 bg-blue-50/50' :
            item.status === 'under_investigation' ? 'border-yellow-200 bg-yellow-50/50' : 
            'border-green-200 bg-green-50/50'
          }`}>
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex space-x-2 items-center">
                  <span className="font-mono text-xs font-bold text-gray-500 uppercase">
                    {item.ticket_number || `OVR-${item.id.slice(-6)}`}
                  </span>
                  <Badge variant={item.vehicle_type === 'visitor' ? 'outline' : 'default'} className={
                    item.vehicle_type === 'da_government' ? 'bg-green-600' : 
                    item.status === 'overstaying' ? 'bg-red-600' : ''
                  }>
                    {item.plate_number}
                  </Badge>
                </div>
                <div className="flex items-center text-xs text-gray-500 font-medium">
                  <Clock className="w-3 h-3 mr-1" />
                  {diffHours > 24 ? `${Math.floor(diffHours/24)}d ${Math.floor(diffHours%24)}h` : `${Math.floor(diffHours)}h ${Math.floor((diffHours%1)*60)}m`}
                </div>
              </div>
              
              <div className="flex items-center text-sm text-gray-700 mb-1">
                <User className="w-3 h-3 mr-2 text-gray-500" />
                <span className="truncate">{item.owner_name}</span>
              </div>
              
              <div className="flex items-center text-xs text-gray-500">
                <Car className="w-3 h-3 mr-2" />
                <span className="capitalize">{item.vehicle_type.replace('_', ' ')}</span>
              </div>
              
              {item.status === 'on_travel' && item.travel_end_date && (
                <div className="mt-2 text-xs font-semibold text-blue-700 bg-blue-100/70 p-1.5 rounded">
                  Returns: {new Date(item.travel_end_date).toLocaleDateString()}
                </div>
              )}
              {item.cause_of_overstaying && (
                <div className="mt-2 text-xs font-semibold text-red-700 bg-red-100 p-1.5 rounded">
                  <span className="block font-bold">Overstay Flag:</span> {item.cause_of_overstaying}
                </div>
              )}
            </CardContent>
          </Card>
          
          <TicketDetailModal 
            isOpen={modalOpen} 
            onClose={() => setModalOpen(false)} 
            ticket={item} 
          />
        </div>
      )}
    </Draggable>
  );
};

export default TicketCard;
