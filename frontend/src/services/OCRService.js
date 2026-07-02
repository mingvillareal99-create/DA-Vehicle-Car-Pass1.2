/**
 * OCR Service - Enhanced for Philippine Driver's License
 * Handles optical character recognition with image preprocessing
 */
import Tesseract from 'tesseract.js';
import { API } from './constants';

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
      
      progressCallback && progressCallback(95, 'AI Cleaning Text...');
      
      const text = result.data.text;
      console.log('OCR Raw Text:', text);
      console.log('OCR Confidence:', result.data.confidence);
      
      let licenseData = null;
      let validationErrors = [];
      
      try {
        console.log('Sending text to local AI inference engine...');
        const response = await fetch(`${API}/parse-license-local`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw_text: text })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const aiResult = await response.json();
        if (aiResult.success) {
           licenseData = aiResult.data;
           console.log('AI Extracted License Data:', licenseData);
        } else {
           console.warn("AI extraction failed, falling back to local JS regex:", aiResult.error);
           licenseData = this.parsePhilippineLicense(text);
        }
      } catch (err) {
        console.warn("Network error reaching AI proxy, falling back to local JS regex:", err);
        licenseData = this.parsePhilippineLicense(text);
      }
      
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
    console.log('Raw text for parsing:', text);

    // 1. Data Cleaning
    // Remove headers like "REPUBLIC OF THE PHILIPPINES", "DRIVER'S LICENSE", or "Last Name. First Name."
    // Also remove garbage characters like '< a =' which often appear in address OCR
    let cleanedText = text
      .replace(/REPUBLIC OF THE PHILIPPINES/gi, '')
      .replace(/DRIVER'?S?\s*LICENSE/gi, '')
      .replace(/Last Name\.?\s*First Name\.?\s*Middle Name/gi, '')
      .replace(/Last Name\.?\s*First Name\.?/gi, '')
      .replace(/[<=]/g, ' ')
      .replace(/<\s*a\s*=/gi, ' ');

    const lines = cleanedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const joinedText = lines.join(' ');

    const { last_name, first_name, middle_name } = this.extractNames(lines);
    let address = this.extractAddress(joinedText);

    // Bicol Sanity Check: If "4418" or "PILI" is detected, ensure proper formatting
    if (address.match(/(4418|PILI)/i)) {
      if (!address.match(/Pili,\s*Camarines\s*Sur/i)) {
        address = address.replace(/(4418|PILI)/gi, 'Pili, Camarines Sur');
      }
    }

    return {
      license_number: this.extractLicenseNumber(cleanedText),
      last_name: last_name,
      first_name: first_name,
      middle_name: middle_name,
      date_of_birth: this.extractDateOfBirth(cleanedText),
      address: address,
      gender: this.extractGender(cleanedText)
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

  static extractNames(lines) {
    let last_name = '';
    let first_name = '';
    let middle_name = '';

    for (let line of lines) {
      if (line.includes(',')) {
        const parts = line.split(',');
        last_name = parts[0].trim();
        
        let restOfName = parts.slice(1).join(',').trim();
        // Remove any non-alphabetical garbage that might be clinging to the name
        restOfName = restOfName.replace(/[^a-zA-Z\s\-]/g, ' ').replace(/\s+/g, ' ');
        
        const words = restOfName.split(/\s+/).filter(w => w.length > 0);
        
        if (words.length > 0) {
          middle_name = words[words.length - 1]; // The last word of that line
          first_name = words.slice(0, words.length - 1).join(' '); // Text between comma and middle name
        }
        break; // Once we find the comma line, we stop
      }
    }

    return { last_name, first_name, middle_name };
  }

  static extractLicenseNumber(text) {
    // Extract the pattern [Letter][2 digits]-[2 digits]-[6 digits]
    const pattern = /([A-Za-z]\d{2}-\d{2}-\d{6})/;
    const match = text.match(pattern);
    return match ? match[1].toUpperCase() : '';
  }

  static extractDateOfBirth(text) {
    // Only extract text in the YYYY/MM/DD format. Ignore any other numbers.
    const pattern = /(\d{4}\/\d{2}\/\d{2})/;
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/\//g, '-'); // Format to YYYY-MM-DD for JSON structure
    }
    return '';
  }

  static extractAddress(text) {
    // Extract the text block starting after "Address" and ending before known fields
    const match = text.match(/Address\s*:?\s*(.*?)(?:License\s*No|Blood\s*Type|Weight|Height)/i);
    let address = '';
    
    if (match && match[1]) {
      address = match[1];
    } else {
      // Fallback if bounds not found, look up to the license number pattern
      const fallbackMatch = text.match(/Address\s*:?\s*(.*?)(?=\b[A-Za-z]\d{2}-\d{2}-\d{6}\b|$)/i);
      if (fallbackMatch && fallbackMatch[1]) {
        address = fallbackMatch[1];
      }
    }
    
    return address.replace(/[^a-zA-Z0-9\s,.-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  static extractGender(text) {
    // Look for a standalone "M" or "F"
    // Using word boundaries \b to ensure it's standalone
    const match = text.match(/\b(M|F)\b/i);
    if (match) {
      return match[1].toUpperCase() === 'M' ? 'male' : 'female';
    }
    return '';
  }
}

export default OCRService;
