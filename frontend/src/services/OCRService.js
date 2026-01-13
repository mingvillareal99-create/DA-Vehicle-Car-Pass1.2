/**
 * OCR Service - Enhanced for Philippine Driver's License
 * Handles optical character recognition with image preprocessing
 */
import Tesseract from 'tesseract.js';

class OCRService {
  /**
   * Extract driver's license data from an image file
   * @param {File} imageFile - The image file to process
   * @param {Function} progressCallback - Callback for progress updates (progress, status)
   * @returns {Promise<Object>} - Extracted license data with success status
   */
  static async extractLicenseData(imageFile, progressCallback) {
    try {
      console.log('Starting OCR processing...');
      progressCallback && progressCallback(10, 'Preparing image...');
      
      // Enhance image before OCR for better accuracy
      const enhancedImage = await this.enhanceImageForOCR(imageFile);
      progressCallback && progressCallback(30, 'Analyzing image...');
      
      const result = await Tesseract.recognize(enhancedImage, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = 30 + (m.progress * 60);
            progressCallback && progressCallback(Math.round(progress), 'Reading text...');
          }
        },
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/., ',
        tessedit_pageseg_mode: Tesseract.PSM.AUTO
      });
      
      progressCallback && progressCallback(95, 'Processing data...');
      
      const text = result.data.text;
      console.log('OCR Raw Text:', text);
      console.log('OCR Confidence:', result.data.confidence);
      
      // Parse license data using enhanced patterns
      const licenseData = this.parsePhilippineLicense(text);
      console.log('Extracted License Data:', licenseData);
      
      progressCallback && progressCallback(100, 'Complete!');
      
      // Validate extracted data
      const validationResult = this.validateExtractedData(licenseData);
      
      return {
        success: validationResult.isValid,
        data: licenseData,
        confidence: result.data.confidence,
        rawText: text,
        validationErrors: validationResult.errors
      };
    } catch (error) {
      console.error('OCR Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enhance image for better OCR accuracy
   * Applies contrast enhancement and grayscale conversion
   */
  static async enhanceImageForOCR(imageFile) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Get and process image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Enhance contrast and convert to high-contrast grayscale
        for (let i = 0; i < data.length; i += 4) {
          // Increase contrast
          data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.5 + 128));
          data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.5 + 128));
          data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.5 + 128));
          
          // Convert to binary (black/white) for better OCR
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = data[i + 1] = data[i + 2] = gray > 128 ? 255 : 0;
        }
        
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(resolve, 'image/png');
      };
      
      img.src = URL.createObjectURL(imageFile);
    });
  }

  /**
   * Parse Philippine driver's license text to extract structured data
   */
  static parsePhilippineLicense(text) {
    const cleanText = text.replace(/[^\w\s\-\/.,]/g, ' ').replace(/\s+/g, ' ').trim();
    console.log('Clean text for parsing:', cleanText);
    
    return {
      license_number: this.extractLicenseNumber(cleanText),
      last_name: this.extractLastName(cleanText),
      first_name: this.extractFirstName(cleanText),
      middle_name: this.extractMiddleName(cleanText),
      date_of_birth: this.extractDateOfBirth(cleanText),
      address: this.extractAddress(cleanText),
      gender: this.extractGender(cleanText)
    };
  }

  /**
   * Validate extracted data quality
   */
  static validateExtractedData(data) {
    const errors = [];
    
    if (!data.license_number || data.license_number.length < 8) {
      errors.push('Invalid license number format');
    }
    if (!data.last_name || data.last_name.length < 2) {
      errors.push('Last name too short or missing');
    }
    if (!data.first_name || data.first_name.length < 2) {
      errors.push('First name too short or missing');
    }
    if (data.date_of_birth && !data.date_of_birth.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push('Invalid date format');
    }
    
    return {
      isValid: errors.length === 0 || errors.length <= 2,
      errors
    };
  }

  // Pattern matching methods for Philippine driver's license

  static extractLicenseNumber(text) {
    const patterns = [
      /([A-Z]\d{2}-\d{2}-\d{6})/g,
      /LICENSE\s*NO\.?\s*:?\s*([A-Z0-9\-]{8,15})/gi,
      /LIC\.?\s*NO\.?\s*:?\s*([A-Z0-9\-]{8,15})/gi,
      /NO\.?\s*([A-Z]\d{2}-\d{2}-\d{6})/gi,
      /([A-Z]\d{2}\s*-?\s*\d{2}\s*-?\s*\d{6})/gi,
      /([A-Z0-9]{3,4}[-\s]\d{2}[-\s]\d{6})/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleaned = match.replace(/[^A-Z0-9\-]/g, '');
          if (cleaned.length >= 8) {
            return cleaned;
          }
        }
      }
    }
    return '';
  }

  static extractLastName(text) {
    const patterns = [
      /SURNAME\s*:?\s*([A-Z][A-Z\s]{2,30})/gi,
      /LAST\s*NAME\s*:?\s*([A-Z][A-Z\s]{2,30})/gi,
      /APELYIDO\s*:?\s*([A-Z][A-Z\s]{2,30})/gi,
      /^([A-Z][A-Z\s]{2,30})\s*,/gmi,
      /4b?\s*([A-Z][A-Z\s]{2,30})/gi
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length > 2 && name.length < 30) {
          return name;
        }
      }
    }
    return '';
  }

  static extractFirstName(text) {
    const patterns = [
      /FIRST\s*NAME\s*:?\s*([A-Z][A-Z\s]{2,30})/gi,
      /GIVEN\s*NAME\s*:?\s*([A-Z][A-Z\s]{2,30})/gi,
      /PANGALAN\s*:?\s*([A-Z][A-Z\s]{2,30})/gi,
      /,\s*([A-Z][A-Z\s]{2,30})/gi,
      /\d+[A-Z]*\s+([A-Z][A-Z\s]{2,25})\s+[A-Z]/gi
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length > 2 && name.length < 30 && !name.includes('MALE') && !name.includes('FEMALE')) {
          return name;
        }
      }
    }
    return '';
  }

  static extractMiddleName(text) {
    const patterns = [
      /MIDDLE\s*NAME\s*:?\s*([A-Z][A-Z\s]{1,20})/gi,
      /M\.?I\.?\s*([A-Z][A-Z\s]{1,20})/gi,
      /([A-Z]+)\s+([A-Z])\s+([A-Z]+)/gi
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length >= 1 && name.length < 20) {
          return name;
        }
      }
    }
    return '';
  }

  static extractDateOfBirth(text) {
    const patterns = [
      /DOB\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      /BIRTH\s*DATE\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      /DATE\s*OF\s*BIRTH\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      /(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      /(\d{1,2}-\d{1,2}-\d{4})/gi,
      /19\d{2}|20\d{2}/gi
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[0]) {
        const dateStr = match[0];
        try {
          if (dateStr.includes('/') || dateStr.includes('-')) {
            const separator = dateStr.includes('/') ? '/' : '-';
            const parts = dateStr.split(separator);
            if (parts.length === 3) {
              const [part1, part2, part3] = parts;
              const year = part3.length === 4 ? part3 : `20${part3}`;
              const month = part1.padStart(2, '0');
              const day = part2.padStart(2, '0');
              return `${year}-${month}-${day}`;
            }
          }
        } catch (error) {
          console.error('Date parsing error:', error);
        }
      }
    }
    return '';
  }

  static extractAddress(text) {
    const patterns = [
      /ADDRESS\s*:?\s*([A-Z0-9\s,.#\-]{10,100})/gi,
      /TIRAHAN\s*:?\s*([A-Z0-9\s,.#\-]{10,100})/gi,
      /([A-Z0-9\s,.#\-]*(?:STREET|ST|AVENUE|AVE|ROAD|RD|BARANGAY|BRGY|CITY|PROVINCE)[A-Z0-9\s,.#\-]*)/gi,
      /\d+\s+[A-Z][A-Z0-9\s,.#\-]{10,80}/gi
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const address = match[1].trim();
        if (address.length > 10 && address.length < 100) {
          return address;
        }
      }
    }
    return '';
  }

  static extractGender(text) {
    const malePatterns = /\b(MALE|M|LALAKI)\b/gi;
    const femalePatterns = /\b(FEMALE|F|BABAE)\b/gi;
    
    if (text.match(malePatterns)) return 'male';
    if (text.match(femalePatterns)) return 'female';
    return '';
  }
}

export default OCRService;
