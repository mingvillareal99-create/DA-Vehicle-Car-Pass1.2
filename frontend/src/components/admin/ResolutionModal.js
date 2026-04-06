import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

const ResolutionModal = ({ isOpen, onClose, onSave, ticket }) => {
  const [note, setNote] = useState('');

  const handleSave = () => {
    onSave(note);
    setNote('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Resolve Overstaying Ticket</DialogTitle>
          <DialogDescription className="sr-only">Form to provide resolution details for the overstaying incident.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="text-sm text-gray-600">
            Please provide details on how the overstaying incident for vehicle <span className="font-bold text-black">{ticket?.plate_number}</span> was resolved.
          </div>
          <div>
            <Label htmlFor="resolution_note">Resolution Details</Label>
            <Textarea
              id="resolution_note"
              placeholder="e.g., Warning given, left without scanning out, fined..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!note.trim()} className="bg-green-600 hover:bg-green-700">Submit Resolution</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResolutionModal;
