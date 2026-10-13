import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { maintenanceAPI, equipmentAPI, authAPI } from '../services/api';
import { Wrench, Plus, X, Filter, ChevronRight, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const statusColors = {
  'Scheduled':   'bg-blue-100 text-blue-700',
  'In Progress': 'bg-indigo-100 text-indigo-700',
  'Completed':   'bg-emerald-100 text-emerald-700',
  'Overdue':     'bg-red-100 text-red-700',
  'Cancelled':   'bg-slate-100 text-slate-500',
};
const StatusBadge = ({ status }) => <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;

// ─── Schedule Maintenance Modal ───────────────────────────────────────────
function ScheduleModal({ onClose, onSaved }) {
  const [equipment, setEquipment] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [form, setForm] = useState({ equipment: '', type: 'Preventive', scheduledDate: new Date().toISOString().slice(0,10), engineer: '', remarks: '', nextServiceDate: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    equipmentAPI.getAll().then(r => r.data.success && setEquipment(r.data.equipment));
    authAPI.getUsers().then(r => r.data.success && setEngineers(r.data.users.filter(u => u.role === 'Biomedical Engineer')));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipment) { alert('Select equipment'); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      await maintenanceAPI.create(formData);
      onSaved();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Schedule Maintenance</h3>
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
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
            <select value={form.type} onChange={e => setForm(f=>({...f, type: e.target.value}))} className="input-field">
              <option value="Preventive">Preventive</option>
              <option value="Corrective">Corrective</option>
              <option value="Routine">Routine</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Scheduled Date</label>
              <input type="date" value={form.scheduledDate} onChange={e => setForm(f=>({...f, scheduledDate: e.target.value}))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Next Service Date</label>
              <input type="date" value={form.nextServiceDate} onChange={e => setForm(f=>({...f, nextServiceDate: e.target.value}))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign Engineer</label>
            <select value={form.engineer} onChange={e => setForm(f=>({...f, engineer: e.target.value}))} className="input-field">
              <option value="">Unassigned</option>
              {engineers.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remarks</label>
            <textarea value={form.remarks} onChange={e => setForm(f=>({...f, remarks: e.target.value}))} className="input-field resize-none" rows={2} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? 'Scheduling...' : 'Schedule'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Update Maintenance Modal (Engineer) ──────────────────────────────────
function UpdateModal({ record, onClose, onSaved }) {
  const [form, setForm] = useState({
    status: record.status,
    completedDate: new Date().toISOString().slice(0,10),
    workDescription: record.workDescription || '',
    partsReplaced: record.partsReplaced || '',
    cost: record.cost || '',
    remarks: record.remarks || '',
    nextServiceDate: record.nextServiceDate ? record.nextServiceDate.slice(0,10) : ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k,v]) => { if (v !== '') formData.append(k, v); });
      await maintenanceAPI.update(record._id, formData);
      onSaved();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Update Maintenance</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-500">Equipment: <strong>{record.equipment?.name}</strong></p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(f=>({...f, status: e.target.value}))} className="input-field">
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          {form.status === 'Completed' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Completed Date</label>
              <input type="date" value={form.completedDate} onChange={e => setForm(f=>({...f, completedDate: e.target.value}))} className="input-field" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Work Description</label>
            <textarea value={form.workDescription} onChange={e => setForm(f=>({...f, workDescription: e.target.value}))} className="input-field resize-none" rows={3} placeholder="Describe the work performed..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Parts Replaced</label>
            <input value={form.partsReplaced} onChange={e => setForm(f=>({...f, partsReplaced: e.target.value}))} className="input-field" placeholder="e.g. Filter, lead wires..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cost (₹)</label>
              <input type="number" value={form.cost} onChange={e => setForm(f=>({...f, cost: e.target.value}))} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Next Service Date</label>
              <input type="date" value={form.nextServiceDate} onChange={e => setForm(f=>({...f, nextServiceDate: e.target.value}))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remarks</label>
            <input value={form.remarks} onChange={e => setForm(f=>({...f, remarks: e.target.value}))} className="input-field" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? 'Updating...' : 'Update'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Maintenance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'Admin';
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showUpdate, setShowUpdate] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      const res = await maintenanceAPI.getAll(params);
      if (res.data.success) setRecords(res.data.maintenance);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus, filterType]);

  const overdueCount = records.filter(r => r.status === 'Overdue').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-700">{overdueCount} overdue</span>
            </div>
          )}
        </div>
        {isAdmin && (
          <button onClick={() => setShowSchedule(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Schedule Maintenance
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 outline-none bg-white">
          <option value="">All Statuses</option>
          <option value="Scheduled">Scheduled</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Overdue">Overdue</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 outline-none bg-white">
          <option value="">All Types</option>
          <option value="Preventive">Preventive</option>
          <option value="Corrective">Corrective</option>
          <option value="Routine">Routine</option>
          <option value="Emergency">Emergency</option>
        </select>
        {(filterStatus || filterType) && (
          <button onClick={() => { setFilterStatus(''); setFilterType(''); }} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
        <span className="text-xs text-slate-400 self-center ml-auto">{records.length} records</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Wrench className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No maintenance records</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Engineer</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Cost</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-3 px-4">
                      <button className="text-left" onClick={() => navigate(`/equipment/${r.equipment?._id}`)}>
                        <p className="text-sm font-semibold text-blue-600 hover:underline">{r.equipment?.name}</p>
                        <p className="text-[11px] text-slate-400">{r.equipment?.equipmentId}</p>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{r.type}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{new Date(r.scheduledDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4"><StatusBadge status={r.status} /></td>
                    <td className="py-3 px-4 text-xs text-slate-600 hidden md:table-cell">{r.engineer?.name || '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 hidden lg:table-cell">{r.cost > 0 ? `₹${r.cost.toLocaleString()}` : '—'}</td>
                    <td className="py-3 px-4">
                      {(isAdmin || r.engineer?._id === user?._id) && r.status !== 'Completed' && r.status !== 'Cancelled' && (
                        <button onClick={() => setShowUpdate(r)} className="text-xs text-blue-600 font-semibold hover:underline opacity-0 group-hover:opacity-100 transition-all">Update</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onSaved={() => { setShowSchedule(false); load(); }} />}
      {showUpdate && <UpdateModal record={showUpdate} onClose={() => setShowUpdate(null)} onSaved={() => { setShowUpdate(null); load(); }} />}
    </div>
  );
}
