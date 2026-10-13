import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Printer, Download, X, Check, Stethoscope, Building2, Tag } from 'lucide-react';

export default function QRGeneratorModal({ isOpen, onClose, equipment }) {
  const [copied, setCopied] = useState(false);
  const printRef = useRef(null);

  if (!isOpen || !equipment) return null;

  const qrValue = `HAMS-EQ-${equipment._id}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Equipment QR Tag - ${equipment.equipmentId}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: #fff;
            }
            .tag-card {
              border: 2px solid #000;
              border-radius: 12px;
              padding: 16px;
              width: 320px;
              text-align: center;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .hospital-header {
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #1e3a8a;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 6px;
              margin-bottom: 12px;
            }
            .eq-name {
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
              margin: 6px 0 2px 0;
            }
            .eq-id {
              font-size: 11px;
              font-family: monospace;
              color: #475569;
              margin-bottom: 10px;
            }
            .qr-container {
              display: flex;
              justify-content: center;
              margin: 12px 0;
            }
            .meta-grid {
              font-size: 10px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px;
              text-align: left;
              margin-top: 10px;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
            }
            .footer-text {
              font-size: 9px;
              color: #94a3b8;
              margin-top: 8px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="tag-card">
            <div class="hospital-header">HAMS MEDICAL ASSET TAG</div>
            <div class="eq-name">${equipment.name}</div>
            <div class="eq-id">ID: ${equipment.equipmentId}</div>
            <div class="qr-container">
              ${document.getElementById('qr-svg-container')?.innerHTML || ''}
            </div>
            <div class="meta-grid">
              <div><strong>Dept:</strong> ${equipment.department?.name || 'General'}</div>
              <div><strong>Model:</strong> ${equipment.model || 'N/A'}</div>
              <div><strong>Serial:</strong> ${equipment.serialNumber || 'N/A'}</div>
              <div><strong>Status:</strong> ${equipment.currentStatus}</div>
            </div>
            <div class="footer-text">SCAN QR CODE TO LOG MAINTENANCE / REPORT ISSUES</div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <QrCode className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Equipment QR Tag Generator</h2>
              <p className="text-[11px] text-emerald-100">Printable asset tag sticker</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5 flex flex-col items-center">
          
          {/* Printable Tag Preview */}
          <div ref={printRef} className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl p-5 shadow-sm text-center flex flex-col items-center space-y-3">
            <div className="w-full border-b border-slate-300 pb-2 flex items-center justify-between">
              <span className="text-[11px] font-black text-blue-900 tracking-wider">HAMS ASSET TAG</span>
              <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{equipment.department?.name || 'Dept'}</span>
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800">{equipment.name}</h3>
              <p className="text-xs font-mono text-slate-500 font-semibold mt-0.5">Asset ID: {equipment.equipmentId}</p>
            </div>

            {/* QR Code SVG */}
            <div id="qr-svg-container" className="p-3 bg-white rounded-xl border border-slate-200 shadow-inner">
              <QRCodeSVG
                value={qrValue}
                size={160}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="w-full grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200 text-left">
              <div>
                <span className="text-slate-400 block text-[9px]">Model</span>
                <span className="font-bold text-slate-700 truncate block">{equipment.model || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Serial No.</span>
                <span className="font-bold text-slate-700 truncate block">{equipment.serialNumber || 'N/A'}</span>
              </div>
            </div>

            <p className="text-[9px] font-bold text-slate-400 tracking-wider">
              STICKER TO BE ATTACHED TO PHYSICAL EQUIPMENT
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2">
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
            >
              <Printer className="h-4 w-4" /> Print QR Sticker Tag
            </button>

            <button
              onClick={handleCopyCode}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Tag className="h-4 w-4 text-slate-500" />}
              {copied ? 'Asset Tag String Copied!' : `Copy Tag Code (${qrValue})`}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
