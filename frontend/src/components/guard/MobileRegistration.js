/**
 * Mobile Registration Component
 * PWA-style wizard for guards to register visitors with OCR support
 * Includes camera capture, driver's license OCR, and offline capability
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API, DA_LOGO_URL } from '../../services/constants';
import OCRService from '../../services/OCRService';
import BarcodeGenerator from '../../services/BarcodeService';
import { OfflineStorageManager } from '../../services/OfflineService';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Textarea } from "../ui/textarea";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { 
  Camera, 
  UserPlus, 
  CheckCircle, 
  Download,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";

const MobileRegistration = () => {
  // Wizard step state (1-4)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Image and OCR state
  const [licensePhoto, setLicensePhoto] = useState(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [ocrDebugText, setOcrDebugText] = useState('');
  const [showOcrDebug, setShowOcrDebug] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    plate_number: '',
    vehicle_type: 'private',
    purpose_of_visit: '',
    department_visiting: '',
    visit_duration: '8_hours',
    driver_license: {
      license_number: '',
      last_name: '',
      first_name: '',
      middle_name: '',
      gender: 'male',
      date_of_birth: '',
      address: ''
    }
  });

  const [message, setMessage] = useState('');
  const [registrationResult, setRegistrationResult] = useState(null);

  // Hooks
  const { user, isOnline } = useAuth();
  const navigate = useNavigate();

  /**
   * Handle camera capture and OCR processing
   */
  const handleCameraCapture = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLicensePhoto(file);
    setOcrProcessing(true);
    setOcrProgress(0);

    try {
      const result = await OCRService.extractLicenseData(file, (progress, status) => {
        setOcrProgress(progress);
        setMessage({ type: 'info', text: status });
      });
      
      console.log('OCR Result:', result);
      
      if (result.success) {
        // Update form with extracted data
        setFormData(prev => ({
          ...prev,
          driver_license: {
            ...prev.driver_license,
            ...result.data
          }
        }));
        
        // Build message showing extracted fields
        const extractedFields = Object.entries(result.data)
          .filter(([key, value]) => value && value.trim && value.trim().length > 0)
          .map(([key, value]) => `${key.replace('_', ' ')}: ${value}`)
          .join(', ');
        
        if (extractedFields) {
          setMessage({ 
            type: 'success', 
            text: `OCR extracted: ${extractedFields}. Please verify in the next step.` 
          });
        } else {
          setMessage({ 
            type: 'warning', 
            text: 'OCR completed but no clear data found. You can input manually.' 
          });
        }
        
        setTimeout(() => setStep(2), 2000);
      } else {
        setMessage({ 
          type: 'error', 
          text: `OCR failed: ${result.error || 'Unable to read license clearly'}. Try again or input manually.` 
        });
      }
      
      // Store raw text for debugging
      if (result.rawText) {
        setOcrDebugText(result.rawText);
      }
      
    } catch (error) {
      console.error('OCR processing error:', error);
      setMessage({ 
        type: 'error', 
        text: 'Error processing image. Please try again with better lighting or input manually.' 
      });
    } finally {
      setOcrProcessing(false);
    }
  };

  /**
   * Retry OCR with a new photo
   */
  const handleRetryOCR = () => {
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
      document.getElementById('license-camera').click();
    } else {
      setMessage({ type: 'info', text: 'Please input the information manually.' });
      setStep(2);
    }
  };

  /**
   * Convert file to base64 for API submission
   */
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  /**
   * Submit registration to server or store offline
   */
  const handleFormSubmit = async () => {
    // Validate required fields
    if (!formData.plate_number || !formData.driver_license.license_number) {
      setMessage({ type: 'error', text: 'Please fill in required fields.' });
      return;
    }

    setLoading(true);
    
    try {
      // Convert license photo to base64
      let licensePhotoBase64 = null;
      if (licensePhoto) {
        licensePhotoBase64 = await fileToBase64(licensePhoto);
      }

      const registrationData = {
        ...formData,
        plate_number: formData.plate_number.toUpperCase(),
        license_photo_base64: licensePhotoBase64
      };

      if (isOnline) {
        // Submit to server
        const response = await axios.post(`${API}/visitor-registration`, registrationData);
        setRegistrationResult(response.data);
        setMessage({ type: 'success', text: 'Visitor registered successfully!' });
        setStep(4);
      } else {
        // Store offline for later sync
        await OfflineStorageManager.storeOfflineData('/visitor-registration', registrationData);
        setMessage({ 
          type: 'success', 
          text: 'Registration stored offline. Will sync when online.' 
        });
        setStep(4);
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (!isOnline) {
        // Store offline on network error
        await OfflineStorageManager.storeOfflineData('/visitor-registration', formData);
        setMessage({ 
          type: 'success', 
          text: 'Registration stored offline. Will sync when online.' 
        });
        setStep(4);
      } else {
        const errorMessage = error.response?.data?.detail || error.message || 'Registration failed';
        setMessage({ type: 'error', text: `Registration failed: ${errorMessage}` });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Download barcode PDF for printing
   */
  const downloadBarcode = () => {
    if (registrationResult) {
      const pdf = BarcodeGenerator.generatePDF(
        registrationResult.plate_number,
        registrationResult.barcode_data,
        registrationResult.expires_at
      );
      pdf.save(`${registrationResult.plate_number}_barcode.pdf`);
    }
  };

  /**
   * Reset form for new registration
   */
  const resetForm = () => {
    setStep(1);
    setFormData({
      plate_number: '',
      vehicle_type: 'private',
      purpose_of_visit: '',
      department_visiting: '',
      visit_duration: '8_hours',
      driver_license: {
        license_number: '',
        last_name: '',
        first_name: '',
        middle_name: '',
        gender: 'male',
        date_of_birth: '',
        address: ''
      }
    });
    setLicensePhoto(null);
    setMessage('');
    setRegistrationResult(null);
    setRetryCount(0);
    setOcrDebugText('');
  };

  // ============================================
  // STEP 1: Camera Capture
  // ============================================
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <img src={DA_LOGO_URL} alt="DA Logo" className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Visitor Registration</h2>
              <p className="text-gray-600">Step 1: Capture Driver&apos;s License</p>
            </div>

            {!ocrProcessing ? (
              <div className="space-y-4">
                {/* Camera capture button */}
                <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center">
                  <Camera className="w-16 h-16 mx-auto mb-4 text-green-600" />
                  <p className="text-gray-600 mb-4">Take a photo of the driver&apos;s license</p>
                  
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    className="hidden"
                    id="license-camera"
                    data-testid="license-camera-input"
                  />
                  
                  <label
                    htmlFor="license-camera"
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Open Camera
                  </label>
                </div>

                {/* Skip OCR option */}
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="w-full"
                  data-testid="skip-ocr-btn"
                >
                  Skip & Enter Manually
                </Button>

                {/* Back to dashboard */}
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
              </div>
            ) : (
              // OCR Processing view
              <div className="space-y-4">
                <div className="text-center">
                  <RefreshCw className="w-16 h-16 mx-auto mb-4 text-green-600 animate-spin" />
                  <p className="text-gray-600 mb-4">Processing license...</p>
                  <Progress value={ocrProgress} className="w-full" />
                  <p className="text-sm text-gray-500 mt-2">{ocrProgress}% complete</p>
                </div>
              </div>
            )}

            {/* Message display */}
            {message && (
              <Alert className={`mt-4 ${message.type === 'error' ? 'border-red-200' : message.type === 'warning' ? 'border-yellow-200' : 'border-green-200'}`}>
                <AlertDescription className={message.type === 'error' ? 'text-red-700' : message.type === 'warning' ? 'text-yellow-700' : 'text-green-700'}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            {/* Retry button after failure */}
            {message?.type === 'error' && !ocrProcessing && (
              <div className="mt-4 flex space-x-2">
                <Button onClick={handleRetryOCR} variant="outline" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry ({2 - retryCount} left)
                </Button>
                <Button onClick={() => setStep(2)} className="flex-1 bg-green-600 hover:bg-green-700">
                  Enter Manually
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // STEP 2: Driver Information
  // ============================================
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <img src={DA_LOGO_URL} alt="DA Logo" className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Driver Information</h2>
              <p className="text-gray-600">Step 2: Verify & Edit Details</p>
            </div>

            {/* OCR Debug toggle */}
            {ocrDebugText && (
              <div className="mb-4">
                <Button
                  onClick={() => setShowOcrDebug(!showOcrDebug)}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  {showOcrDebug ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                  {showOcrDebug ? 'Hide' : 'Show'} OCR Raw Text
                </Button>
                {showOcrDebug && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono max-h-32 overflow-y-auto">
                    {ocrDebugText}
                  </div>
                )}
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-4">
              <div>
                <Label>License Number *</Label>
                <Input
                  value={formData.driver_license.license_number}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    driver_license: { ...prev.driver_license, license_number: e.target.value }
                  }))}
                  placeholder="A00-00-000000"
                  className="font-mono"
                  data-testid="license-number-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input
                    value={formData.driver_license.first_name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      driver_license: { ...prev.driver_license, first_name: e.target.value }
                    }))}
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input
                    value={formData.driver_license.last_name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      driver_license: { ...prev.driver_license, last_name: e.target.value }
                    }))}
                    placeholder="Dela Cruz"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Middle Name</Label>
                  <Input
                    value={formData.driver_license.middle_name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      driver_license: { ...prev.driver_license, middle_name: e.target.value }
                    }))}
                    placeholder="Santos"
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select 
                    value={formData.driver_license.gender}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      driver_license: { ...prev.driver_license, gender: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.driver_license.date_of_birth}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    driver_license: { ...prev.driver_license, date_of_birth: e.target.value }
                  }))}
                />
              </div>

              <div>
                <Label>Address</Label>
                <Textarea
                  value={formData.driver_license.address}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    driver_license: { ...prev.driver_license, address: e.target.value }
                  }))}
                  placeholder="Full address"
                  rows={2}
                />
              </div>

              {/* Navigation buttons */}
              <div className="flex space-x-3 mt-6">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="step2-next-btn"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // STEP 3: Vehicle Information
  // ============================================
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <img src={DA_LOGO_URL} alt="DA Logo" className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Vehicle Information</h2>
              <p className="text-gray-600">Step 3: Vehicle & Visit Details</p>
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              <div>
                <Label>Plate Number *</Label>
                <Input
                  value={formData.plate_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, plate_number: e.target.value }))}
                  placeholder="ABC-1234"
                  className="text-lg font-mono"
                  data-testid="vehicle-plate-input"
                />
              </div>

              <div>
                <Label>Vehicle Type</Label>
                <Select 
                  value={formData.vehicle_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private Vehicle</SelectItem>
                    <SelectItem value="company">DA Government Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Purpose of Visit *</Label>
                <Textarea
                  value={formData.purpose_of_visit}
                  onChange={(e) => setFormData(prev => ({ ...prev, purpose_of_visit: e.target.value }))}
                  placeholder="Meeting, delivery, inspection, etc."
                  rows={2}
                />
              </div>

              <div>
                <Label>Department/Person Visiting</Label>
                <Input
                  value={formData.department_visiting}
                  onChange={(e) => setFormData(prev => ({ ...prev, department_visiting: e.target.value }))}
                  placeholder="Field Operations, Admin, etc."
                />
              </div>

              <div>
                <Label>Visit Duration</Label>
                <Select 
                  value={formData.visit_duration} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, visit_duration: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2_hours">2 Hours</SelectItem>
                    <SelectItem value="4_hours">4 Hours</SelectItem>
                    <SelectItem value="8_hours">8 Hours</SelectItem>
                    <SelectItem value="1_day">1 Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Navigation buttons */}
              <div className="flex space-x-3 mt-6">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleFormSubmit}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="register-submit-btn"
                >
                  {loading ? 'Registering...' : 'Register'}
                </Button>
              </div>
            </div>

            {/* Message display */}
            {message && (
              <Alert className={`mt-4 ${message.type === 'error' ? 'border-red-200' : 'border-green-200'}`}>
                <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // STEP 4: Success & Barcode
  // ============================================
  if (step === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Success header */}
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900">Registration Complete!</h2>
              <p className="text-gray-600">Visitor successfully registered</p>
            </div>

            {registrationResult && (
              <div className="space-y-4">
                {/* Registration details */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800">Registration Details</h3>
                  <p className="text-green-700">Plate: {registrationResult.plate_number}</p>
                  <p className="text-green-700">
                    Valid until: {new Date(registrationResult.expires_at).toLocaleString()}
                  </p>
                </div>

                {/* Barcode display */}
                <div className="text-center">
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-4">
                    <canvas 
                      ref={(canvas) => {
                        if (canvas && registrationResult.barcode_data) {
                          JsBarcode(canvas, registrationResult.barcode_data, {
                            format: 'CODE128',
                            width: 2,
                            height: 60,
                            displayValue: true
                          });
                        }
                      }}
                    />
                  </div>
                  
                  <Button
                    onClick={downloadBarcode}
                    className="w-full bg-green-600 hover:bg-green-700 mb-3"
                    data-testid="download-barcode-btn"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Barcode PDF
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3 mt-6">
              <Button
                onClick={resetForm}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="register-another-btn"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Register Another Visitor
              </Button>
              
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MobileRegistration;
