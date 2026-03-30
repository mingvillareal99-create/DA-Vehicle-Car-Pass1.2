/**
 * Visitor Detail Modal Component
 * Displays full details of a visitor registration in a dialog
 */
import React, { useState, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import BarcodeGenerator from '../../services/BarcodeService';
import { BACKEND_URL } from '../../services/constants';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Eye, Camera, CreditCard, Calendar, MapPin, Download, X, Edit3, Save } from "lucide-react";

const VisitorDetailModal = ({ visitor, isOpen, onClose, onSave, defaultEditMode = false }) => {
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});

  useEffect(() => {
    if (isOpen && visitor) {
      setEditedData({...visitor});
      setIsEditing(defaultEditMode);
    }
  }, [isOpen, visitor, defaultEditMode]);

  // Don't render if no visitor selected
  if (!visitor) return null;

  /**
   * Format datetime string for display
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  /**
   * Check if visitor pass is still valid
   */
  const isActive = editedData.is_active !== false && new Date(editedData.expires_at) > new Date();

  const handleSaveClick = () => {
    if (onSave) {
      onSave(editedData);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-700 flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Visitor Details - {editedData.plate_number || (visitor && visitor.plate_number)}
            </DialogTitle>
          </DialogHeader>
        
        <div className="space-y-6">
          {/* Vehicle Information Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-green-600">Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Plate Number</Label>
                {isEditing ? (
                  <Input 
                    value={editedData.plate_number || ''} 
                    onChange={e => setEditedData({...editedData, plate_number: e.target.value.toUpperCase()})}
                    className="mt-1 font-mono font-bold uppercase"
                  />
                ) : (
                  <p className="text-lg font-mono font-bold">{editedData.plate_number}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Vehicle Type</Label>
                {isEditing ? (
                  <Select 
                    value={editedData.vehicle_type || "private"} 
                    onValueChange={(val) => setEditedData({...editedData, vehicle_type: val})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Vehicle Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="da_government">DA Government</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="ml-2">
                    {editedData.vehicle_type ? editedData.vehicle_type.toUpperCase().replace('_', ' ') : ''}
                  </Badge>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Purpose of Visit</Label>
                {isEditing ? (
                  <Input 
                    value={editedData.purpose_of_visit || ''} 
                    onChange={e => setEditedData({...editedData, purpose_of_visit: e.target.value})}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm">{editedData.purpose_of_visit}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Department Visiting</Label>
                {isEditing ? (
                  <Input 
                    value={editedData.department_visiting || ''} 
                    onChange={e => setEditedData({...editedData, department_visiting: e.target.value})}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm">{editedData.department_visiting || 'N/A'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Driver Information Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-green-600">Driver Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left column - Text info */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                    {isEditing ? (
                      <div className="flex space-x-2 mt-1">
                        <Input 
                          placeholder="First Name"
                          value={editedData.driver_license?.first_name || ''} 
                          onChange={e => setEditedData({...editedData, driver_license: {...editedData.driver_license, first_name: e.target.value}})}
                        />
                        <Input 
                          placeholder="M.I."
                          className="w-16"
                          value={editedData.driver_license?.middle_name || ''} 
                          onChange={e => setEditedData({...editedData, driver_license: {...editedData.driver_license, middle_name: e.target.value}})}
                        />
                        <Input 
                          placeholder="Last Name"
                          value={editedData.driver_license?.last_name || ''} 
                          onChange={e => setEditedData({...editedData, driver_license: {...editedData.driver_license, last_name: e.target.value}})}
                        />
                      </div>
                    ) : (
                      <p className="font-semibold capitalize">
                        {editedData.driver_license && [editedData.driver_license.first_name, editedData.driver_license.middle_name, editedData.driver_license.last_name].filter(Boolean).join(' ')}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 flex items-center">
                      <CreditCard className="w-4 h-4 mr-1" />
                      License Number
                    </Label>
                    {isEditing ? (
                      <Input 
                        className="mt-1"
                        value={editedData.driver_license?.license_number || ''} 
                        onChange={e => setEditedData({...editedData, driver_license: {...editedData.driver_license, license_number: e.target.value.toUpperCase()}})}
                      />
                    ) : (
                      <p className="font-mono text-sm">{editedData.driver_license?.license_number}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Gender</Label>
                      {isEditing ? (
                        <Select 
                          value={editedData.driver_license?.gender || "male"} 
                          onValueChange={(val) => setEditedData({...editedData, driver_license: {...editedData.driver_license, gender: val}})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="capitalize">{editedData.driver_license?.gender}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Date of Birth
                      </Label>
                      {isEditing ? (
                        <Input 
                          type="date"
                          className="mt-1"
                          value={editedData.driver_license?.date_of_birth || ''} 
                          onChange={e => setEditedData({...editedData, driver_license: {...editedData.driver_license, date_of_birth: e.target.value}})}
                        />
                      ) : (
                        <p className="text-sm">{editedData.driver_license?.date_of_birth || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      Address
                    </Label>
                    {isEditing ? (
                      <Input 
                        className="mt-1"
                        value={editedData.driver_license?.address || ''} 
                        onChange={e => setEditedData({...editedData, driver_license: {...editedData.driver_license, address: e.target.value}})}
                      />
                    ) : (
                      <p className="text-sm">{editedData.driver_license?.address}</p>
                    )}
                  </div>
                </div>

                {/* Right column - License Photo */}
                <div>
                  <Label className="text-sm font-medium text-gray-600">Driver&apos;s License Photo</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {editedData.driver_license?.license_photo_path ? (
                      <div className="text-center">
                        <img 
                          src={`${BACKEND_URL}/uploads/${editedData.driver_license.license_photo_path.split(/[\\/]/).pop()}`}
                          alt="Driver's License"
                          className="max-w-full max-h-48 mx-auto rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setIsPhotoExpanded(true)}
                          title="Click to enlarge"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className="hidden text-gray-500">
                          <Camera className="w-12 h-12 mx-auto mb-2" />
                          <p className="text-sm">License photo not available</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Camera className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-sm">No license photo captured</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visit Information Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-green-600">Visit Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Visit Duration</Label>
                <Badge variant="outline" className="ml-2">
                  {editedData.visit_duration ? editedData.visit_duration.replace('_', ' ').toUpperCase() : ''}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Registration Date</Label>
                <p className="text-sm">{editedData.created_at && formatDate(editedData.created_at)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Expires At</Label>
                <p className="text-sm font-medium text-orange-600">{editedData.expires_at && formatDate(editedData.expires_at)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Status</Label>
                {isEditing ? (
                  <Select 
                    value={editedData.is_active !== false ? "active" : "inactive"} 
                    onValueChange={(val) => setEditedData({...editedData, is_active: val === "active"})}
                  >
                    <SelectTrigger className="mt-1 w-full max-w-[200px]">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive / Expired</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge 
                    variant={isActive ? 'default' : 'destructive'} 
                    className={`ml-2 ${isActive ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                  >
                    {isActive ? 'ACTIVE' : 'EXPIRED'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Barcode Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-green-600">Access Barcode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-4 inline-block">
                  <canvas 
                    ref={(canvas) => {
                      if (canvas && editedData.barcode_data) {
                        JsBarcode(canvas, editedData.barcode_data, {
                          format: 'CODE128',
                          width: 2,
                          height: 60,
                          displayValue: true,
                          fontSize: 12
                        });
                      }
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600">Barcode Data: {editedData.barcode_data}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-end space-x-2 mt-6">
          {isEditing ? (
            <Button
              onClick={handleSaveClick}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="border-gray-300 text-gray-700"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Visitor
            </Button>
          )}
          <Button
            onClick={() => {
              const pdf = BarcodeGenerator.generatePDF(
                editedData.plate_number,
                editedData.barcode_data,
                editedData.expires_at
              );
              pdf.save(`${editedData.plate_number}_visitor_pass.pdf`);
            }}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="download-pass-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Pass
          </Button>
          <Button variant="outline" onClick={onClose} data-testid="close-modal-btn">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Expanded Photo Modal */}
    {editedData?.driver_license?.license_photo_path && (
      <Dialog open={isPhotoExpanded} onOpenChange={setIsPhotoExpanded}>
        <DialogContent hideCloseButton={true} className="max-w-4xl p-0 bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">Expanded Driver's License Photo</DialogTitle>
          <div className="relative mx-auto w-fit">
            <button
              onClick={() => setIsPhotoExpanded(false)}
              className="absolute -top-4 -right-4 bg-white text-gray-800 rounded-full p-2 shadow-xl hover:bg-gray-100 hover:scale-110 transition-all z-50 border border-gray-200"
              title="Close image"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={`${BACKEND_URL}/uploads/${editedData.driver_license.license_photo_path.split(/[\\/]/).pop()}`}
              alt="Driver's License Expanded"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};

export default VisitorDetailModal;
