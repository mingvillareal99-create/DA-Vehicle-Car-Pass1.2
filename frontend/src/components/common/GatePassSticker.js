import React from 'react';
import BarcodeGenerator from '../../services/BarcodeService';
import stickerBase from '../../assets/da_gatepass_sticker_base.png';

/**
 * Official DA Gate Pass Sticker Component
 * Renders the official Department of Agriculture Bicol Region Sticker Badge
 * with a dynamically positioned Code-128 barcode for any vehicle plate number.
 */
const GatePassSticker = ({ plateNumber, width = 340, height = 340, className = "" }) => {
  const cleanPlate = (plateNumber || 'SAMPLE-123').toUpperCase().trim();
  const barcodeDataUrl = BarcodeGenerator.generateBarcode(cleanPlate);

  return (
    <div 
      className={`relative inline-block overflow-hidden rounded-2xl shadow-md border border-gray-200 bg-white select-none ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Official DA Bicol Region Sticker Template Background */}
      <img 
        src={stickerBase} 
        alt="DA Gate Pass Sticker Badge" 
        className="w-full h-full object-cover"
      />

      {/* Dynamic Barcode Overlay - Positioned in the center of the white box */}
      <div 
        className="absolute flex items-center justify-center pointer-events-none"
        style={{ 
          top: '74.12%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          width: '66%', 
          height: '21%' 
        }}
      >
        <img 
          src={barcodeDataUrl} 
          alt={`Barcode for ${cleanPlate}`} 
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};

export default GatePassSticker;
