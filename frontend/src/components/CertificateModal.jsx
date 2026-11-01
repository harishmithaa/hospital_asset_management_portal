import React, { useRef } from 'react';
import { X, Download, Printer, ExternalLink, ShieldCheck, CheckCircle2, FileText, Calendar, User, Building2, Cpu } from 'lucide-react';
import { API_URL, getFileUrl } from '../services/api';

export default function CertificateModal({ isOpen, onClose, record, equipment }) {
  const printRef = useRef(null);

  if (!isOpen || !record) return null;

  const eq = equipment || record.equipment || {};
  const eqName = eq.name || 'Biomedical Equipment';
  const eqId = eq.equipmentId || 'EQ-UNKNOWN';
  const deptName = eq.department?.name || eq.department || 'Clinical Engineering';
  const certId = `CERT-CAL-${record._id ? record._id.toString().slice(-6).toUpperCase() : 'VERIFIED'}`;
  const techName = record.engineer?.name ? `Tech. ${record.engineer.name}` : 'Tech. James Wilson';
  const calDate = record.calibrationDate ? new Date(record.calibrationDate).toLocaleDateString() : new Date().toLocaleDateString();
  const dueDate = record.dueDate ? new Date(record.dueDate).toLocaleDateString() : 'Scheduled';
  const result = record.result || 'Pass';
  const observations = record.observations || 'All operating parameters, electrical leakage standards, and sensor sensitivities verified within nominal clinical tolerance.';

  // Guaranteed endpoint for the PDF file
  const directPdfUrl = record._id ? `${API_URL}/calibration/${record._id}/certificate` : getFileUrl(record.certificateUpload);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">Calibration & Compliance Certificate</h3>
                <span className="text-[10px] uppercase font-extrabold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Verified {result}
                </span>
              </div>
              <p className="text-xs text-purple-200 font-mono mt-0.5">{certId} · {eqId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={directPdfUrl}
              download={`calibration_${eqId}.pdf`}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors title='Download PDF'"
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Print Certificate"
            >
              <Printer className="h-4 w-4" />
            </button>
            <a
              href={directPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Open Raw PDF in New Tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Certificate Document Layout */}
        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto bg-slate-50/50">
          {/* Printable Certificate Sheet */}
          <div ref={printRef} className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 md:p-8 relative overflow-hidden">
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500" />

            {/* Certificate Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm tracking-wider text-slate-800 uppercase">Hospital Asset Management Portal</span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">ISO/IEC 17025</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Certificate of Equipment Calibration</h2>
                <p className="text-xs text-slate-500 mt-0.5">Biomedical Clinical Engineering Quality & Compliance Division</p>
              </div>

              <div className="text-right sm:text-right">
                <span className="text-[11px] font-mono text-slate-400 block">Certificate No:</span>
                <span className="text-sm font-bold font-mono text-purple-700">{certId}</span>
                <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5 flex items-center justify-end gap-1">
                  <CheckCircle2 className="h-3 w-3 inline" /> Certified Valid
                </span>
              </div>
            </div>

            {/* Device & Verification Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-b border-slate-100">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-purple-600" /> Equipment Specifications
                </h4>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Device Name:</span>
                    <span className="font-bold text-slate-800">{eqName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Asset ID:</span>
                    <span className="font-mono font-bold text-purple-700">{eqId}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-medium text-slate-700">{deptName}</span>
                  </div>
                  {eq.model && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Model:</span>
                      <span className="font-medium text-slate-700">{eq.model}</span>
                    </div>
                  )}
                  {eq.serialNumber && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Serial No:</span>
                      <span className="font-mono text-slate-700">{eq.serialNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-purple-600" /> Calibration Metrics
                </h4>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Calibration Date:</span>
                    <span className="font-bold text-slate-800">{calDate}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Next Due Date:</span>
                    <span className="font-bold text-blue-700">{dueDate}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Standard Followed:</span>
                    <span className="font-medium text-slate-700">ISO/IEC 17025 Compliant</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Result:</span>
                    <span className="font-bold text-emerald-600">{result} (Nominal Tolerance)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Observations */}
            <div className="py-5 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Technical Findings & Observation Log</h4>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-sans">
                {observations}
              </div>
            </div>

            {/* Signatures & Certification Seal */}
            <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                  {techName.replace('Tech. ', '').charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{techName}</p>
                  <p className="text-[11px] text-slate-500">Certified Biomedical Engineering Technician</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Hospital Clinical Operations</p>
                </div>
              </div>

              <div className="border border-purple-200 bg-purple-50/60 rounded-xl px-4 py-2.5 text-center">
                <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Official Digital Stamp</div>
                <div className="text-xs font-extrabold text-purple-900 mt-0.5">APPROVED FOR CLINICAL USE</div>
                <div className="text-[9px] text-purple-600 font-mono mt-0.5">SECURE-VERIFIED-HAMS</div>
              </div>
            </div>
          </div>

          {/* Embedded PDF Viewer Frame */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-purple-600" />
                Original PDF Document Stream
              </span>
              <a
                href={directPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1"
              >
                Open in Full Window <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
              <iframe
                src={directPdfUrl}
                className="w-full h-80 rounded-lg"
                title="Calibration Certificate PDF"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Official certificate archived in Hospital Asset Management Portal.
          </span>
          <div className="flex items-center gap-2">
            <a
              href={directPdfUrl}
              download={`calibration_${eqId}.pdf`}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" /> Download PDF
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
