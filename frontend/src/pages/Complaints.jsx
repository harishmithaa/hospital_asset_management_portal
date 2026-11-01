import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { complaintAPI, authAPI, vendorAPI } from '../services/api';
import { AlertCircle, X, ChevronRight, ClipboardList, Building2, Calendar, Clock, Send, CheckCircle2 } from 'lucide-react';

const statusColors = {
  'Open':               'bg-blue-100 text-blue-700',
  'Assigned':           'bg-amber-100 text-amber-700',
  'In Progress':        'bg-indigo-100 text-indigo-700',
  'Waiting for Parts':  'bg-orange-100 text-orange-700',
  'Waiting for Vendor': 'bg-purple-100 text-purple-700 border border-purple-200',
  'Completed':          'bg-emerald-100 text-emerald-700',
  'Closed':             'bg-slate-100 text-slate-500',
  'Cancelled':          'bg-red-100 text-red-700',
};
const priorityColors = {
  'Critical': 'bg-red-100 text-red-700',
  'High':     'bg-orange-100 text-orange-700',
  'Medium':   'bg-amber-100 text-amber-700',
  'Low':      'bg-green-100 text-green-700',
};
const Badge = ({ label, color }) => <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>;

// ─── Pass Issue to Vendor Modal (Technician / Admin) ──────────────────────────
function PassToVendorModal({ complaint, onClose, onSaved }) {
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({
    vendorId: '',
    dispatchNotes: '',
    scheduledArrivalDate: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    vendorAPI.getAll().then(res => {
      if (res.data.success) {
        const list = res.data.vendors || [];
        setVendors(list);

        // Pre-select equipment's registered vendor if available
        const defaultVendorId = complaint.equipment?.supplierVendor?._id || complaint.equipment?.supplierVendor;
        if (defaultVendorId) {
          setForm(f => ({ ...f, vendorId: defaultVendorId }));
        } else if (list.length > 0) {
          setForm(f => ({ ...f, vendorId: list[0]._id }));
        }
      }
    });
  }, [complaint]);

  const selectedVendor = vendors.find(v => v._id === form.vendorId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorId) {
      setError('Please select a vendor.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await complaintAPI.passToVendor(complaint._id, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to pass issue to vendor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Pass Issue to Equipment Vendor</h3>
              <p className="text-[11px] text-purple-100">Escalate maintenance to authorized OEM service partner</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">{error}</div>}

          {/* Equipment & Issue Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">{complaint.equipment?.name}</span>
              <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                {complaint.equipment?.equipmentId}
              </span>
            </div>
            <p className="text-xs text-slate-600 line-clamp-2"><strong>Issue:</strong> {complaint.issueDescription}</p>
          </div>

          {/* Vendor Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Authorized Equipment Vendor *</label>
            <select
              value={form.vendorId}
              onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none bg-white font-medium"
              required
            >
              <option value="">Select Vendor Company</option>
              {vendors.map(v => (
                <option key={v._id} value={v._id}>
                  {v.companyName} {v.specialization ? `(${v.specialization})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Vendor Details Card */}
          {selectedVendor && (
            <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl text-xs space-y-1">
              <p className="font-bold text-purple-900">{selectedVendor.companyName}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-purple-700 pt-1">
                <span>Contact: {selectedVendor.contactPerson || 'N/A'}</span>
                <span>Phone: {selectedVendor.phone || 'N/A'}</span>
                <span className="col-span-2 truncate">Email: {selectedVendor.email || 'N/A'}</span>
              </div>
            </div>
          )}

          {/* Scheduled Arrival Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expected / Scheduled Vendor Arrival Date</label>
            <input
              type="date"
              value={form.scheduledArrivalDate}
              onChange={e => setForm(f => ({ ...f, scheduledArrivalDate: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">Technician can update the arrival date when vendor arrives on-site.</p>
          </div>

          {/* Dispatch Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Technical Notes for Vendor *</label>
            <textarea
              value={form.dispatchNotes}
              onChange={e => setForm(f => ({ ...f, dispatchNotes: e.target.value }))}
              rows={3}
              placeholder="Explain why OEM vendor is needed (e.g. specialized replacement parts, motherboard diagnostics, warranty calibration)..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none resize-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <Send className="h-4 w-4" />
              <span>{saving ? 'Passing to Vendor...' : 'Dispatch to Vendor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Mark Vendor Arrival & Progress Modal (Technician / Admin) ────────────────
function VendorArrivalModal({ complaint, onClose, onSaved }) {
  const [form, setForm] = useState({
    vendorArrivalDate: complaint.vendorArrivalDate ? new Date(complaint.vendorArrivalDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    vendorServiceStatus: complaint.vendorServiceStatus || 'Vendor Arrived',
    note: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await complaintAPI.updateVendorArrival(complaint._id, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update vendor arrival');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Vendor Arrival & Service Tracking</h3>
              <p className="text-[11px] text-indigo-100">Log OEM vendor arrival date and visit findings</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">{error}</div>}

          {/* Vendor & Equipment Banner */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950">
                Vendor: {complaint.assignedVendor?.companyName || 'OEM Vendor'}
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                {complaint.complaintId}
              </span>
            </div>
            <p className="text-xs text-slate-600">Equipment: <strong>{complaint.equipment?.name}</strong></p>
          </div>

          {/* Arrival Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vendor Arrival Date *</label>
            <input
              type="date"
              value={form.vendorArrivalDate}
              onChange={e => setForm(f => ({ ...f, vendorArrivalDate: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              required
            />
          </div>

          {/* Service Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vendor Visit Status</label>
            <select
              value={form.vendorServiceStatus}
              onChange={e => setForm(f => ({ ...f, vendorServiceStatus: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white font-medium"
            >
              <option value="Vendor Visit Scheduled">Vendor Visit Scheduled</option>
              <option value="Vendor Arrived">Vendor Arrived on Site</option>
              <option value="Resolved by Vendor">Resolved by Vendor (Service Completed)</option>
            </select>
          </div>

          {/* Note / Findings */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Technician Visit Note / Findings (optional)</label>
            <textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={3}
              placeholder="Enter details on vendor arrival, parts inspected, or service outcome..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Update Arrival'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assign Engineer / Update Complaint Modal ─────────────────────────────
function UpdateModal({ complaint, engineers, onClose, onSaved }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'Admin';
  const isEngineer = user?.role === 'Technician' || user?.role === 'Biomedical Engineer';

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
    ? ['Open','Assigned','In Progress','Waiting for Parts','Waiting for Vendor','Completed','Closed','Cancelled']
    : isEngineer
    ? ['In Progress','Waiting for Parts','Waiting for Vendor','Completed']
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
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign Technician</label>
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

          {(isAdmin || isEngineer) && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/checklist?complaintId=${complaint._id}`);
                }}
                className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <ClipboardList className="h-4 w-4 text-blue-600" />
                <span>Open Service Checklist & Spare Parts Log</span>
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-1">
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
  const isEngineer = user?.role === 'Technician' || user?.role === 'Biomedical Engineer';

  const [complaints, setComplaints] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showUpdate, setShowUpdate] = useState(null);
  const [showPassToVendor, setShowPassToVendor] = useState(null);
  const [showVendorArrival, setShowVendorArrival] = useState(null);

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
        if (users.data.success) setEngineers(users.data.users.filter(u => u.role === 'Technician' || u.role === 'Biomedical Engineer'));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus, filterPriority]);

  const openCount = complaints.filter(c => ['Open','Assigned','In Progress','Waiting for Vendor','Waiting for Parts'].includes(c.status)).length;
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
          <option value="Waiting for Vendor">Waiting for Vendor</option>
          <option value="Waiting for Parts">Waiting for Parts</option>
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
                  <th className="py-3 px-4 text-right">Actions</th>
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

                      {/* Vendor escalation status & arrival pill */}
                      {c.passedToVendor && (
                        <div className="mt-1 space-y-0.5">
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 w-fit">
                            <Building2 className="h-3 w-3 text-purple-600" />
                            <span>Vendor: {c.assignedVendor?.companyName || 'OEM Vendor'}</span>
                          </div>
                          {c.vendorArrivalDate && (
                            <div className="flex items-center gap-1 text-[10px] font-medium text-indigo-600">
                              <Calendar className="h-2.5 w-2.5 text-indigo-500" />
                              <span>Arrival: {new Date(c.vendorArrivalDate).toLocaleDateString()}</span>
                              <span className="text-[9px] text-slate-400 font-mono">({c.vendorServiceStatus || 'Scheduled'})</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 hidden md:table-cell max-w-[200px] truncate" title={c.issueDescription}>
                      {c.issueDescription}
                    </td>
                    <td className="py-3 px-4"><Badge label={c.priority} color={priorityColors[c.priority] || 'bg-slate-100 text-slate-600'} /></td>
                    <td className="py-3 px-4"><Badge label={c.status} color={statusColors[c.status] || 'bg-slate-100 text-slate-600'} /></td>
                    <td className="py-3 px-4 text-xs text-slate-600 hidden lg:table-cell">{c.assignedEngineer?.name || '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-400 hidden lg:table-cell">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        {/* Technician / Admin: Pass to Vendor button */}
                        {(isAdmin || isEngineer) && !c.passedToVendor && !['Completed','Closed','Cancelled'].includes(c.status) && (
                          <button
                            onClick={() => setShowPassToVendor(c)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 shadow-xs"
                            title="Pass this issue to the equipment's OEM vendor"
                          >
                            <Building2 className="h-3 w-3 text-purple-600" />
                            <span>Pass to Vendor</span>
                          </button>
                        )}

                        {/* Technician / Admin: Mark Vendor Arrival button */}
                        {(isAdmin || isEngineer) && c.passedToVendor && (
                          <button
                            onClick={() => setShowVendorArrival(c)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 shadow-xs"
                            title="Log vendor arrival date & visit findings"
                          >
                            <Calendar className="h-3 w-3 text-indigo-600" />
                            <span>{c.vendorArrivalDate ? 'Arrival Log' : 'Mark Arrival'}</span>
                          </button>
                        )}

                        {(isAdmin || isEngineer) && (
                          <button
                            onClick={() => navigate(`/checklist?complaintId=${c._id}`)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 shadow-xs"
                            title="Open Service Checklist & Spare Parts"
                          >
                            <ClipboardList className="h-3 w-3 text-blue-600" />
                            <span className="hidden sm:inline">Checklist</span>
                          </button>
                        )}

                        {(isAdmin || isEngineer) && !['Completed','Closed','Cancelled'].includes(c.status) && (
                          <button
                            onClick={() => setShowUpdate(c)}
                            className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            Update
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUpdate && (
        <UpdateModal
          complaint={showUpdate}
          engineers={engineers}
          onClose={() => setShowUpdate(null)}
          onSaved={() => { setShowUpdate(null); load(); }}
        />
      )}

      {showPassToVendor && (
        <PassToVendorModal
          complaint={showPassToVendor}
          onClose={() => setShowPassToVendor(null)}
          onSaved={() => { setShowPassToVendor(null); load(); }}
        />
      )}

      {showVendorArrival && (
        <VendorArrivalModal
          complaint={showVendorArrival}
          onClose={() => setShowVendorArrival(null)}
          onSaved={() => { setShowVendorArrival(null); load(); }}
        />
      )}
    </div>
  );
}
