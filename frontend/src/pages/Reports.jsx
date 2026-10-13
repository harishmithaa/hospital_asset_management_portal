import React, { useState } from 'react';
import { reportAPI } from '../services/api';
import { BarChart3, Download, Loader, FileText } from 'lucide-react';

const REPORT_TYPES = [
  { key: 'equipment',    label: 'Equipment Register',         desc: 'Full list of all registered equipment with specs and status' },
  { key: 'maintenance',  label: 'Maintenance History',         desc: 'All maintenance records with work performed and costs' },
  { key: 'complaint',    label: 'Complaint Report',            desc: 'All complaints with priority, status, and resolution details' },
  { key: 'calibration',  label: 'Calibration Records',         desc: 'All calibration records with results and next due dates' },
  { key: 'warranty-amc', label: 'Warranty & AMC Status',       desc: 'Current warranty and AMC status for all equipment' },
];

function toCSV(data, type) {
  if (!data || data.length === 0) return '';

  const flatten = (obj, prefix = '') => {
    const result = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const fullKey = prefix ? `${prefix}_${key}` : key;
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        Object.assign(result, flatten(val, fullKey));
      } else if (Array.isArray(val)) {
        result[fullKey] = val.length;
      } else if (val instanceof Date) {
        result[fullKey] = val.toLocaleDateString();
      } else {
        result[fullKey] = val ?? '';
      }
    }
    return result;
  };

  const rows = data.map(row => flatten(row));
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const csvRows = [
    headers.join(','),
    ...rows.map(row => headers.map(h => {
      const val = String(row[h] ?? '').replace(/"/g, '""');
      return val.includes(',') || val.includes('\n') ? `"${val}"` : val;
    }).join(','))
  ];

  return csvRows.join('\n');
}

export default function Reports() {
  const [selectedType, setSelectedType] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateReport = async () => {
    if (!selectedType) return;
    setLoading(true); setError(''); setReportData(null);
    try {
      const res = await reportAPI.getReport(selectedType);
      if (res.data.success) setReportData(res.data);
      else setError(res.data.message || 'Failed');
    } catch (err) { setError(err.response?.data?.message || 'Failed to generate report'); }
    finally { setLoading(false); }
  };

  const downloadCSV = () => {
    if (!reportData) return;
    const csv = toCSV(reportData.data, reportData.type);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const rpt = REPORT_TYPES.find(r => r.key === reportData.type);
    a.href = url; a.download = `HAMS_${rpt?.label?.replace(/ /g,'_')}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedRpt = REPORT_TYPES.find(r => r.key === selectedType);

  // Table columns mapping per type
  const getColumns = (type) => {
    switch (type) {
      case 'equipment': return ['equipmentId','name','category','manufacturer','modelNumber','serialNumber','currentStatus','department_name','purchaseDate','purchaseCost','warrantyEnd','amcEnd'];
      case 'maintenance': return ['equipment_equipmentId','equipment_name','type','scheduledDate','completedDate','status','cost','workDescription','partsReplaced'];
      case 'complaint': return ['complaintId','equipment_name','equipment_equipmentId','priority','status','issueDescription','raisedBy_name','assignedEngineer_name','createdAt'];
      case 'calibration': return ['equipment_equipmentId','equipment_name','calibrationDate','dueDate','result','status','observations','engineer_name'];
      case 'warranty-amc': return ['equipmentId','name','department','vendor','warrantyStart','warrantyEnd','warrantyStatus','amcStart','amcEnd','amcStatus'];
      default: return [];
    }
  };

  const getCellValue = (row, col) => {
    const parts = col.split('_');
    let val = row;
    for (const p of parts) {
      if (val && typeof val === 'object') val = val[p];
      else { val = null; break; }
    }
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'number') return col.includes('cost') || col.includes('Cost') || col.includes('Value') ? `₹${val.toLocaleString()}` : val;
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(val).toLocaleDateString();
    return String(val);
  };

  const colLabel = (col) => col.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

  return (
    <div className="space-y-5">
      {/* Report selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Generate Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {REPORT_TYPES.map(rpt => (
            <button
              key={rpt.key}
              onClick={() => { setSelectedType(rpt.key); setReportData(null); setError(''); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${selectedType === rpt.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className={`h-4 w-4 ${selectedType === rpt.key ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${selectedType === rpt.key ? 'text-blue-700' : 'text-slate-700'}`}>{rpt.label}</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">{rpt.desc}</p>
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={generateReport}
            disabled={!selectedType || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {reportData && (
            <button onClick={downloadCSV} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      {/* Report data table */}
      {reportData && reportData.data.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">{selectedRpt?.label}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{reportData.count} records</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {getColumns(reportData.type).map(col => (
                    <th key={col} className="text-left py-2.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{colLabel(col)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportData.data.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    {getColumns(reportData.type).map(col => (
                      <td key={col} className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">{getCellValue(row, col)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportData && reportData.data.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No data for this report</p>
        </div>
      )}
    </div>
  );
}
