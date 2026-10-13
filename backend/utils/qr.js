const QRCode = require('qrcode');

/**
 * Generates a base64 QR code image string from a given text or URL.
 * @param {string} text - The content of the QR code (typically the Equipment ID or details link).
 * @returns {Promise<string>} The base64 data URL representing the QR code.
 */
const generateQRCode = async (text) => {
  try {
    // Generate QR code as PNG data URL
    const qrDataUrl = await QRCode.toDataURL(text, {
      color: {
        dark: '#1e293b', // Slate 800
        light: '#ffffff'
      },
      width: 300,
      margin: 2
    });
    return qrDataUrl;
  } catch (error) {
    console.error(`Error generating QR Code: ${error.message}`);
    return '';
  }
};

module.exports = { generateQRCode };
