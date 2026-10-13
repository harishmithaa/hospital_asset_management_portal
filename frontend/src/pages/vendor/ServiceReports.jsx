import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { maintenanceAPI } from '../../services/api';
import { FileText, Upload, CheckCircle, X } from 'lucide-react';

// ─── Upload Report Modal ──────────────────────────────────────────────────
function UploadModal({ record, onClose, onSaved }) {
  const [form, setForm] = useState({
    status: 'Completed',
    completedDate: new Date().toISOString().slice(0,10),
    workDescription: record.workDescription || '',
    partsReplaced: record.partsReplaced || '',
    cost: record.cost || '',
    remarks: record.remarks || ''
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.workDescription) { setError('Work description is required.'); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k,v]) => { if (v !== '') formData.append(k, v); });
      if (file) formData.append('reportPath', file);
      await maintenanceAPI.update(record._id, formData);
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Upload failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Upload Service Report</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <p className="text-xs text-slate-500">Equipment: <strong>{record.equipment?.name}</strong></p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Completion Date</label>
            <input type="date" value={form.completedDate} onChange={e => setForm(f=>({...f, completedDate: e.target.value}))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Work Description *</label>
            <textarea value={form.workDescription} onChange={e => setForm(f=>({...f, workDescription: e.target.value}))} className="input-field resize-none" rows={3} required placeholder="Describe the service work performed..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Parts Replaced</label>
            <input value={form.partsReplaced} onChange={e => setForm(f=>({...f, partsReplaced: e.target.value}))} className="input-field" placeholder="e.g. Filter, sensor, PCB..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Service Cost (₹)</label>
            <input type="number" value={form.cost} onChange={e => setForm(f=>({...f, cost: e.target.value}))} className="input-field" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Service Report / Invoice (PDF)</label>
            <input type="file" accept=".pdf,.jpg,.png" onChange={e => setFile(e.target.files[0])} className="text-xs text-slate-600" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remarks</label>
            <textarea value={form.remarks} onChange={e => setForm(f=>({...f, remarks: e.target.value}))} className="input-field resize-none" rows={2} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? 'Uploading...' : 'Submit Report'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ServiceReports() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await maintenanceAPI.getAll();
      if (res.data.success) setRecords(res.data.maintenance);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const pending = records.filter(r => !['Completed','Cancelled'].includes(r.status));
  const completed = records.filter(r => r.status === 'Completed');

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Service Reports</h2>
          <p className="text-xs text-slate-500">Upload completed service documentation for equipment</p>
        </div>
      </div>

      {/* Pending — require action */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pending — Action Required ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map(r => (
              <div key={r._id} className="bg-white rounded-xl border-2 border-amber-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{r.equipment?.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{r.equipment?.equipmentId}</p>
                    <div className="mt-1.5 flex gap-3 text-xs text-slate-500">
                      <span>{r.type} · {new Date(r.scheduledDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUpload(r)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Completed ({completed.length})</h3>
          <div className="space-y-3">
            {completed.map(r => (
              <div key={r._id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <p className="text-sm font-semibold text-slate-800">{r.equipment?.name}</p>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{r.equipment?.equipmentId}</p>
                    {r.completedDate && <p className="text-xs text-slate-500 mt-0.5">Completed: {new Date(r.completedDate).toLocaleDateString()}</p>}
                    {r.workDescription && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{r.workDescription}</p>}
                    {r.cost > 0 && <p className="text-xs text-slate-500 mt-0.5">Cost: ₹{r.cost.toLocaleString()}</p>}
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">Completed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-48"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      )}

      {!loading && records.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No service records found</p>
        </div>
      )}

      {showUpload && (
        <UploadModal
          record={showUpload}
          onClose={() => setShowUpload(null)}
          onSaved={() => { setShowUpload(null); load(); }}
        />
      )}
    </div>
  );
}
