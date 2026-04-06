import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

const TravelModal = ({ isOpen, onClose, onSave, ticket }) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [location, setLocation] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = () => {
    if (!orderNumber || !location || !endDate) return;
    
    // Add time to the end date (end of day)
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    
    onSave({
      travel_order_number: orderNumber,
      travel_location: location,
      travel_end_date: endDateTime.toISOString()
    });
    setOrderNumber('');
    setLocation('');
    setEndDate('');
  };

  const handleClose = () => {
    setOrderNumber('');
    setLocation('');
    setEndDate('');
    onClose();
  };

  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Vehicle Owner On Travel</DialogTitle>
          <DialogDescription className="sr-only">Form to provide travel order details to excuse overstaying.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="text-sm text-gray-600 bg-blue-50/50 p-2 rounded border border-blue-100">
            <p>Moving this vehicle to <strong>On Travel</strong> requires travel authorization details. If the travel expires without the vehicle departing, it will be automatically flagged as overstaying again.</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="orderNumber">Travel Order / Pass Number</Label>
              <Input
                id="orderNumber"
                placeholder="e.g. TO-2026-0451"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="location">Travel Location</Label>
              <Input
                id="location"
                placeholder="Destination city or site"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="block mb-1">Expected Return Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={`w-full justify-start font-normal border-gray-300 shadow-sm ${!endDate && 'text-gray-500'}`}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(new Date(endDate.replace(/-/g, '/')), "PPP") : <span>Pick a returning date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate ? new Date(endDate.replace(/-/g, '/')) : undefined}
                    onSelect={(d) => setEndDate(d ? d.toLocaleDateString('en-CA') : '')}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!orderNumber || !location || !endDate}
          >
            Mark On Travel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TravelModal;
