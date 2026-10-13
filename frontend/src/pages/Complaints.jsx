import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { complaintAPI, authAPI } from '../services/api';
import { AlertCircle, X, ChevronRight } from 'lucide-react';

const statusColors = {
  'Open':        'bg-blue-100 text-blue-700',
  'Assigned':    'bg-amber-100 text-amber-700',
  'In Progress': 'bg-indigo-100 text-indigo-700',
  'Completed':   'bg-emerald-100 text-emerald-700',
  'Closed':      'bg-slate-100 text-slate-500',
  'Cancelled':   'bg-red-100 text-red-700',
};
const priorityColors = {
  'Critical': 'bg-red-100 text-red-700',
  'High':     'bg-orange-100 text-orange-700',
  'Medium':   'bg-amber-100 text-amber-700',
  'Low':      'bg-green-100 text-green-700',
};
const Badge = ({ label, color }) => <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>;

// ─── Assign Engineer / Update Complaint Modal ─────────────────────────────
function UpdateModal({ complaint, engineers, onClose, onSaved }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isEngineer = user?.role === 'Biomedical Engineer';

  const [form, setForm] = useState({
    assignedEngineer: complaint.assignedEngineer?._id || '',
    status: complaint.status,
    note: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {};
      if (isAdmin && form.assignedEngineer && form.assignedEngineer !== String(complaint.assignedEngineer?._id)) body.assignedEngineer = form.assignedEngineer;
      if (form.status !== complaint.status) body.status = form.status;
      if (form.note) body.note = form.note;
      await complaintAPI.update(complaint._id, body);
      onSaved();
    } catch (err) { alert(err.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const availableStatuses = isAdmin
    ? ['Open','Assigned','In Progress','Completed','Closed','Cancelled']
    : isEngineer
    ? ['In Progress','Completed']
    : [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Update Complaint</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs font-semibold text-slate-700">{complaint.complaintId}</p>
            <p className="text-xs text-slate-500 mt-0.5">{complaint.issueDescription}</p>
          </div>
          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign Engineer</label>
              <select value={form.assignedEngineer} onChange={e => setForm(f=>({...f, assignedEngineer: e.target.value}))} className="input-field">
                <option value="">Unassigned</option>
                {engineers.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(f=>({...f, status: e.target.value}))} className="input-field">
              {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Note (optional)</label>
            <textarea value={form.note} onChange={e => setForm(f=>({...f, note: e.target.value}))} className="input-field resize-none" rows={2} placeholder="Add a progress note..." />
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

export default function Complaints() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'Admin';
  const isEngineer = user?.role === 'Biomedical Engineer';

  const [complaints, setComplaints] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showUpdate, setShowUpdate] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const [comp] = await Promise.all([complaintAPI.getAll(params)]);
      if (comp.data.success) setComplaints(comp.data.complaints);
      if (isAdmin && engineers.length === 0) {
        const users = await authAPI.getUsers();
        if (users.data.success) setEngineers(users.data.users.filter(u => u.role === 'Biomedical Engineer'));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus, filterPriority]);

  const openCount = complaints.filter(c => ['Open','Assigned','In Progress'].includes(c.status)).length;
  const criticalCount = complaints.filter(c => c.priority === 'Critical' && !['Completed','Closed'].includes(c.status)).length;

  return (
    <div className="space-y-5">
      {/* Alert banners */}
      <div className="flex gap-3 flex-wrap">
        {openCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-blue-700">{openCount} open</span>
          </div>
        )}
        {criticalCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs font-semibold text-red-700">{criticalCount} critical</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 outline-none bg-white">
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Closed">Closed</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 outline-none bg-white">
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        {(filterStatus || filterPriority) && (
          <button onClick={() => { setFilterStatus(''); setFilterPriority(''); }} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
        <span className="text-xs text-slate-400 self-center ml-auto">{complaints.length} records</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No complaints found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Issue</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Assigned To</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Raised</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map(c => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-3 px-4 text-xs font-mono text-slate-700">{c.complaintId}</td>
                    <td className="py-3 px-4">
                      <button className="text-left" onClick={() => navigate(`/equipment/${c.equipment?._id}`)}>
                        <p className="text-xs font-semibold text-blue-600 hover:underline">{c.equipment?.name}</p>
                        <p className="text-[10px] text-slate-400">{c.equipment?.equipmentId}</p>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 hidden md:table-cell max-w-[200px] truncate">{c.issueDescription}</td>
                    <td className="py-3 px-4"><Badge label={c.priority} color={priorityColors[c.priority] || 'bg-slate-100 text-slate-600'} /></td>
                    <td className="py-3 px-4"><Badge label={c.status} color={statusColors[c.status] || 'bg-slate-100 text-slate-600'} /></td>
                    <td className="py-3 px-4 text-xs text-slate-600 hidden lg:table-cell">{c.assignedEngineer?.name || '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-400 hidden lg:table-cell">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      {(isAdmin || isEngineer) && !['Completed','Closed','Cancelled'].includes(c.status) && (
                        <button onClick={() => setShowUpdate(c)} className="text-xs text-blue-600 font-semibold hover:underline opacity-0 group-hover:opacity-100 transition-all">Update</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUpdate && <UpdateModal complaint={showUpdate} engineers={engineers} onClose={() => setShowUpdate(null)} onSaved={() => { setShowUpdate(null); load(); }} />}
    </div>
  );
}
