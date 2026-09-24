/**
 * Barcode Service
 * Handles barcode generation and PDF creation for visitor passes
 */
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import stickerBase from '../assets/da_gatepass_sticker_base.png';

class BarcodeGenerator {
  /**
   * Format a numerical counter or raw string into a sequential six-digit serial number with leading zeros starting at 000001
   * @param {number|string} number - Sequence number or raw string
   * @returns {string} - Six-digit formatted serial string (e.g., "000001")
   */
  static formatSerialNumber(number) {
    const parsed = parseInt(number, 10);
    const num = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    return String(num).padStart(6, '0');
  }

  /**
   * Generate a barcode image as a data URL
   * @param {string} text - The text to encode in the barcode
   * @param {object} options - Optional JsBarcode customization options
   * @returns {string} - Base64 data URL of the barcode image
   */
  static generateBarcode(text, options = {}) {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: true,
      font: 'monospace',
      fontOptions: 'bold',
      fontSize: 16,
      textMargin: 3,
      margin: 4,
      background: '#ffffff',
      lineColor: '#000000',
      ...options
    });
    return canvas.toDataURL();
  }

  /**
   * Generate a full high-resolution composite sticker image as a Data URL (official template + dynamic barcode)
   * @param {string} plateNumber - Vehicle plate number to encode
   * @returns {Promise<string>} Base64 PNG data URL
   */
  static async generateStickerDataUrl(plateNumber) {
    return new Promise((resolve, reject) => {
      const cleanPlate = (plateNumber || 'SAMPLE-123').toUpperCase().trim();
      const barcodeDataUrl = BarcodeGenerator.generateBarcode(cleanPlate, {
        width: 3,
        height: 75,
        fontSize: 18,
        fontOptions: 'bold',
        textMargin: 4,
        margin: 4,
        background: '#ffffff',
        lineColor: '#000000'
      });

      const baseImg = new Image();
      baseImg.crossOrigin = 'anonymous';
      baseImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = baseImg.naturalWidth || baseImg.width || 1024;
        canvas.height = baseImg.naturalHeight || baseImg.height || 1024;
        const ctx = canvas.getContext('2d');

        // Draw base sticker badge template
        ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

        // Position barcode centered in the white box
        // Center X = 50%, Center Y = 74.12%, Width = 66%, Height = 21%
        const bcImg = new Image();
        bcImg.onload = () => {
          const bcW = canvas.width * 0.66;
          const bcH = canvas.height * 0.21;
          const bcX = (canvas.width - bcW) / 2;
          const bcY = (canvas.height * 0.7412) - (bcH / 2);

          ctx.drawImage(bcImg, bcX, bcY, bcW, bcH);
          resolve(canvas.toDataURL('image/png'));
        };
        bcImg.onerror = reject;
        bcImg.src = barcodeDataUrl;
      };
      baseImg.onerror = reject;
      baseImg.src = stickerBase;
    });
  }

  /**
   * Print sticker directly via hidden iframe formatted for 3x3 / 4x4 label sticker printers
   * @param {string} plateNumber - Vehicle plate number
   */
  static async printSticker(plateNumber) {
    try {
      const cleanPlate = (plateNumber || 'SAMPLE-123').toUpperCase().trim();
      const stickerDataUrl = await BarcodeGenerator.generateStickerDataUrl(cleanPlate);

      // Clean up any existing print iframe
      const oldFrame = document.getElementById('sticker-print-frame');
      if (oldFrame && oldFrame.parentNode) {
        oldFrame.parentNode.removeChild(oldFrame);
      }

      const printFrame = document.createElement('iframe');
      printFrame.id = 'sticker-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      printFrame.style.zIndex = '-9999';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>DA Gate Pass Sticker - ${cleanPlate}</title>
            <style>
              @page {
                size: 3in 3in;
                margin: 0;
              }
              @media print {
                html, body {
                  width: 100%;
                  height: 100%;
                  margin: 0;
                  padding: 0;
                  background: #ffffff;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .sticker-wrapper {
                  width: 100%;
                  height: 100%;
                  max-width: 3in;
                  max-height: 3in;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-sizing: border-box;
                }
                img {
                  width: 100%;
                  height: 100%;
                  object-fit: contain;
                  display: block;
                }
              }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              img {
                max-width: 100%;
                height: auto;
              }
            </style>
          </head>
          <body>
            <div class="sticker-wrapper">
              <img src="${stickerDataUrl}" alt="DA Gate Pass Sticker" />
            </div>
            <script>
              window.onload = function() {
                window.focus();
                setTimeout(function() {
                  window.print();
                }, 250);
              };
            </script>
          </body>
        </html>
      `);
      frameDoc.close();
    } catch (err) {
      console.error('Failed to trigger direct sticker print:', err);
    }
  }

  /**
   * Generate official PDF sticker sized for 3x3 label printing
   * @param {string} plateNumber - Vehicle plate number
   * @param {number} sizeInches - Square label size in inches (default 3)
   */
  static async downloadStickerPDF(plateNumber, sizeInches = 3) {
    const cleanPlate = (plateNumber || 'SAMPLE-123').toUpperCase().trim();
    const stickerDataUrl = await BarcodeGenerator.generateStickerDataUrl(cleanPlate);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: [sizeInches, sizeInches]
    });

    pdf.addImage(stickerDataUrl, 'PNG', 0, 0, sizeInches, sizeInches);
    pdf.save(`DA_Sticker_${cleanPlate}.pdf`);
    return pdf;
  }

  /**
   * Backwards compatible generatePDF function
   */
  static async generatePDF(plateNumber, barcodeData, expiresAt) {
    return BarcodeGenerator.downloadStickerPDF(plateNumber);
  }
}

export default BarcodeGenerator;
