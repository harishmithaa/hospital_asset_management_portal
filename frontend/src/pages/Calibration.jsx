import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { calibrationAPI, equipmentAPI, authAPI, getFileUrl } from '../services/api';
import { Gauge, Plus, X, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

const statusColors = {
  'Completed': 'bg-emerald-100 text-emerald-700',
  'Pending':   'bg-blue-100 text-blue-700',
  'Overdue':   'bg-red-100 text-red-700',
  'Cancelled': 'bg-slate-100 text-slate-500',
};

// ─── Log Calibration Modal ────────────────────────────────────────────────
function CalibrationModal({ onClose, onSaved }) {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [form, setForm] = useState({ equipment: '', calibrationDate: new Date().toISOString().slice(0,10), dueDate: '', result: 'Pass', observations: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    equipmentAPI.getAll().then(r => r.data.success && setEquipment(r.data.equipment));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipment || !form.dueDate) { alert('Equipment and next due date are required'); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k,v]) => formData.append(k, v));
      formData.append('engineer', user._id);
      formData.append('status', 'Completed');
      if (file) formData.append('certificateUpload', file);
      await calibrationAPI.create(formData);
      onSaved();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Log Calibration</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Equipment *</label>
            <select value={form.equipment} onChange={e => setForm(f=>({...f, equipment: e.target.value}))} className="input-field" required>
              <option value="">Select equipment</option>
              {equipment.map(e => <option key={e._id} value={e._id}>{e.name} ({e.equipmentId})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Calibration Date</label>
              <input type="date" value={form.calibrationDate} onChange={e => setForm(f=>({...f, calibrationDate: e.target.value}))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Next Due Date *</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f=>({...f, dueDate: e.target.value}))} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Result</label>
            <select value={form.result} onChange={e => setForm(f=>({...f, result: e.target.value}))} className="input-field">
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observations</label>
            <textarea value={form.observations} onChange={e => setForm(f=>({...f, observations: e.target.value}))} className="input-field resize-none" rows={2} placeholder="Calibration observations..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Calibration Certificate (optional)</label>
            <input type="file" onChange={e => setFile(e.target.files[0])} className="text-xs text-slate-600" accept=".pdf,.jpg,.png" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving...' : 'Log Calibration'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Calibration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'Admin';
  const isEngineer = user?.role === 'Biomedical Engineer';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await calibrationAPI.getAll(params);
      if (res.data.success) setRecords(res.data.calibrations);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus]);

  const overdueCount = records.filter(r => r.status === 'Overdue').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-700">{overdueCount} overdue calibrations</span>
            </div>
          )}
        </div>
        {(isAdmin || isEngineer) && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Log Calibration
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-purple-500 outline-none bg-white">
          <option value="">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
        </select>
        {filterStatus && (
          <button onClick={() => setFilterStatus('')} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
        <span className="text-xs text-slate-400 self-center ml-auto">{records.length} records</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Gauge className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No calibration records</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Calibration Date</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Next Due</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Result</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Engineer</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <button className="text-left" onClick={() => navigate(`/equipment/${r.equipment?._id}`)}>
                        <p className="text-xs font-semibold text-blue-600 hover:underline">{r.equipment?.name}</p>
                        <p className="text-[10px] text-slate-400">{r.equipment?.equipmentId}</p>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{new Date(r.calibrationDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-xs">
                      <span className={new Date(r.dueDate) < new Date() && r.status !== 'Completed' ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                        {new Date(r.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.result === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.result}</span>
                    </td>
                    <td className="py-3 px-4"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span></td>
                    <td className="py-3 px-4 text-xs text-slate-600 hidden md:table-cell">{r.engineer?.name || '—'}</td>
                    <td className="py-3 px-4">
                      {r.certificateUpload && (
                        <a href={getFileUrl(r.certificateUpload)} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Cert
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <CalibrationModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
