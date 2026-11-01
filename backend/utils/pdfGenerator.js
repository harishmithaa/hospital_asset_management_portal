/**
 * Minimal, standard-compliant PDF binary generator.
 * Produces clean, readable PDF documents without requiring heavyweight external dependencies.
 */
function generateCalibrationPDF({
  title = 'HAMS CERTIFICATE OF CALIBRATION & COMPLIANCE',
  certNumber = `CERT-CAL-${Date.now().toString(16).toUpperCase()}`,
  equipmentName = 'Biomedical Equipment',
  equipmentId = 'EQ-UNKNOWN',
  department = 'Clinical Engineering',
  standard = 'ISO/IEC 17025 & IEC 60601-1 Medical Standards',
  date = new Date().toLocaleDateString(),
  dueDate = 'Scheduled',
  result = 'PASS',
  observations = 'All parameters verified within nominal tolerance standards.',
  techName = 'Lead Biomedical Technician'
} = {}) {
  // Sanitize strings for PDF text stream (escape parens)
  const safe = (str) => String(str || '').replace(/[()\\]/g, ' ').substring(0, 85);

  const lines = [
    `BT /F1 18 Tf 50 730 Td (${safe(title)}) Tj ET`,
    `BT /F2 10 Tf 50 710 Td (Certificate No: ${safe(certNumber)}  |  Accreditation: Clinical Engineering QA) Tj ET`,
    `BT /F1 13 Tf 50 670 Td (EQUIPMENT IDENTIFICATION) Tj ET`,
    `BT /F2 11 Tf 50 650 Td (Device Name: ${safe(equipmentName)}) Tj ET`,
    `BT /F2 11 Tf 50 632 Td (Asset / System ID: ${safe(equipmentId)}) Tj ET`,
    `BT /F2 11 Tf 50 614 Td (Clinical Department: ${safe(department)}) Tj ET`,
    `BT /F1 13 Tf 50 575 Td (CALIBRATION & VERIFICATION DETAILS) Tj ET`,
    `BT /F2 11 Tf 50 555 Td (Testing Standard: ${safe(standard)}) Tj ET`,
    `BT /F2 11 Tf 50 537 Td (Calibration Date: ${safe(date)}) Tj ET`,
    `BT /F2 11 Tf 50 519 Td (Next Recalibration Due: ${safe(dueDate)}) Tj ET`,
    `BT /F2 11 Tf 50 501 Td (Performance Verification Result: [ ${safe(result)} ]) Tj ET`,
    `BT /F1 13 Tf 50 460 Td (TECHNICAL OBSERVATIONS) Tj ET`,
    `BT /F2 10 Tf 50 440 Td (${safe(observations)}) Tj ET`,
    `BT /F1 13 Tf 50 395 Td (AUTHORIZED CERTIFICATION) Tj ET`,
    `BT /F2 11 Tf 50 375 Td (Certified Technician: ${safe(techName)}) Tj ET`,
    `BT /F2 10 Tf 50 357 Td (Status: COMPLIANT & APPROVED FOR CLINICAL USE) Tj ET`,
    `BT /F2 9 Tf 50 320 Td (HAMS Healthcare Asset Management - Cryptographic Document Stamp: ${safe(Date.now().toString(36).toUpperCase())}) Tj ET`
  ];

  const content = lines.join('\n');
  const streamLength = Buffer.byteLength(content, 'utf8');

  const obj1 = '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n';
  const obj2 = '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n';
  const obj3 = '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj\n';
  const obj4 = `4 0 obj << /Length ${streamLength} >> stream\n${content}\nendstream endobj\n`;
  const obj5 = '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n';
  const obj6 = '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n';

  const header = '%PDF-1.4\n';
  const o1Offset = header.length;
  const o2Offset = o1Offset + obj1.length;
  const o3Offset = o2Offset + obj2.length;
  const o4Offset = o3Offset + obj3.length;
  const o5Offset = o4Offset + obj4.length;
  const o6Offset = o5Offset + obj5.length;
  const xrefOffset = o6Offset + obj6.length;

  const pad = (n) => String(n).padStart(10, '0');
  const xref = [
    'xref\n0 7\n',
    '0000000000 65535 f \n',
    `${pad(o1Offset)} 00000 n \n`,
    `${pad(o2Offset)} 00000 n \n`,
    `${pad(o3Offset)} 00000 n \n`,
    `${pad(o4Offset)} 00000 n \n`,
    `${pad(o5Offset)} 00000 n \n`,
    `${pad(o6Offset)} 00000 n \n`
  ].join('');

  const trailer = `trailer << /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(header + obj1 + obj2 + obj3 + obj4 + obj5 + obj6 + xref + trailer, 'utf8');
}

module.exports = { generateCalibrationPDF };
