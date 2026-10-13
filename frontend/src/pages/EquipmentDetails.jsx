import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import QRGeneratorModal from '../components/QRGeneratorModal';
import { equipmentAPI, departmentAPI, authAPI, vendorAPI, maintenanceAPI, complaintAPI, calibrationAPI, transferAPI, disposalAPI, getFileUrl } from '../services/api';
import {
  ArrowLeft, Stethoscope, Building2, User, Calendar, DollarSign, Wrench,
  AlertCircle, Gauge, ShieldCheck, ArrowLeftRight, Trash2, FileText,
  QrCode, Download, Plus, X, CheckCircle, Clock, Edit2, ChevronRight,
  Package, MapPin, Activity, TriangleAlert
} from 'lucide-react';

const statusColors = {
  'Working':            'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Under Maintenance':  'bg-amber-100 text-amber-700 border-amber-200',
  'Out of Service':     'bg-red-100 text-red-700 border-red-200',
  'Disposed':           'bg-slate-100 text-slate-500 border-slate-200',
};

const StatusBadge = ({ status, large }) => (
  <span className={`inline-flex items-center font-semibold rounded-full border ${large ? 'text-sm px-3 py-1' : 'text-[10px] px-2 py-0.5'} ${statusColors[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
    {status}
  </span>
);

const complaintStatusColors = {
  'Open': 'bg-blue-100 text-blue-700', 'Assigned': 'bg-amber-100 text-amber-700',
  'Accepted': 'bg-purple-100 text-purple-700',
  'In Progress': 'bg-indigo-100 text-indigo-700',
  'Waiting for Parts': 'bg-orange-100 text-orange-700',
  'Completed': 'bg-emerald-100 text-emerald-700',
  'Closed': 'bg-slate-100 text-slate-500', 'Cancelled': 'bg-red-100 text-red-700',
};
const ComplaintBadge = ({ status }) => (
  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${complaintStatusColors[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>
);

const TABS = ['Overview','Maintenance','Complaints','Calibration','Warranty & AMC','Transfer History','Documents'];

// ─── Transfer Modal ───────────────────────────────────────────────────────
function TransferModal({ equipment, departments, onClose, onSaved }) {
  const [form, setForm] = useState({ newDepartment: '', reason: '', roomNumber: '', building: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const availableDepts = departments.filter(d => d._id !== (equipment.department?._id || equipment.department));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.newDepartment || !form.reason) { setError('Department and reason are required.'); return; }
    setSaving(true);
    try {
      await transferAPI.create({ equipment: equipment._id, newDepartment: form.newDepartment, reason: form.reason, roomNumber: form.roomNumber, building: form.building });
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Transfer failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Transfer Equipment</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div>
            <p className="text-xs text-slate-500 mb-3">Transferring: <strong>{equipment.name}</strong> from <strong>{equipment.department?.name}</strong></p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">New Department *</label>
            <select value={form.newDepartment} onChange={e => setForm(f => ({...f, newDepartment: e.target.value}))} className="input-field">
              <option value="">Select department</option>
              {availableDepts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Room Number</label>
            <input value={form.roomNumber} onChange={e => setForm(f => ({...f, roomNumber: e.target.value}))} className="input-field" placeholder="e.g. C-102" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reason for Transfer *</label>
            <textarea value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} className="input-field resize-none" rows={3} placeholder="Reason for transfer..." />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? 'Transferring...' : 'Transfer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Disposal Modal ───────────────────────────────────────────────────────
function DisposalModal({ equipment, onClose, onSaved }) {
  const [form, setForm] = useState({ disposalDate: new Date().toISOString().slice(0,10), reason: '', disposalMethod: '', scrapValue: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reason || !form.disposalMethod) { setError('Reason and disposal method are required.'); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k,v]) => { if (v) formData.append(k,v); });
      formData.append('equipment', equipment._id);
      await disposalAPI.create(formData);
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Disposal failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-red-600">Dispose Equipment</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700 font-medium">⚠ This will permanently mark <strong>{equipment.name}</strong> as Disposed. This action cannot be undone.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Disposal Date</label>
            <input type="date" value={form.disposalDate} onChange={e => setForm(f => ({...f, disposalDate: e.target.value}))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reason *</label>
            <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} className="input-field" placeholder="e.g. End of useful life, beyond repair" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Disposal Method *</label>
            <select value={form.disposalMethod} onChange={e => setForm(f => ({...f, disposalMethod: e.target.value}))} className="input-field">
              <option value="">Select method</option>
              <option value="Scrapping">Scrapping</option>
              <option value="Auction">Auction</option>
              <option value="Donation">Donation</option>
              <option value="Return to Vendor">Return to Vendor</option>
              <option value="Medical Waste Disposal">Medical Waste Disposal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Scrap Value (₹)</label>
            <input type="number" value={form.scrapValue} onChange={e => setForm(f => ({...f, scrapValue: e.target.value}))} className="input-field" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remarks</label>
            <textarea value={form.remarks} onChange={e => setForm(f => ({...f, remarks: e.target.value}))} className="input-field resize-none" rows={2} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50">{saving ? 'Processing...' : 'Confirm Disposal'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Maintenance Modal ────────────────────────────────────────────────
function AddMaintenanceModal({ equipment, engineers, onClose, onSaved }) {
  const [form, setForm] = useState({ type: 'Preventive', scheduledDate: new Date().toISOString().slice(0,10), engineer: '', remarks: '', nextServiceDate: '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      formData.append('equipment', equipment._id);
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
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
            <select value={form.type} onChange={e => setForm(f=>({...f, type: e.target.value}))} className="input-field">
              <option value="Preventive">Preventive</option>
              <option value="Corrective">Corrective</option>
              <option value="Routine">Routine</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Scheduled Date</label>
            <input type="date" value={form.scheduledDate} onChange={e => setForm(f=>({...f, scheduledDate: e.target.value}))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign Engineer</label>
            <select value={form.engineer} onChange={e => setForm(f=>({...f, engineer: e.target.value}))} className="input-field">
              <option value="">Select engineer</option>
              {engineers.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Next Service Date</label>
            <input type="date" value={form.nextServiceDate} onChange={e => setForm(f=>({...f, nextServiceDate: e.target.value}))} className="input-field" />
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

// ─── Add Calibration Modal ────────────────────────────────────────────────
function AddCalibrationModal({ equipment, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ calibrationDate: new Date().toISOString().slice(0,10), dueDate: '', result: 'Pass', observations: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.dueDate) { alert('Next due date is required'); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k,v]) => formData.append(k, v));
      formData.append('equipment', equipment._id);
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Calibration Date</label>
              <input type="date" value={form.calibrationDate} onChange={e => setForm(f=>({...f, calibrationDate: e.target.value}))} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Next Due Date *</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f=>({...f, dueDate: e.target.value}))} className="input-field" />
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
            <textarea value={form.observations} onChange={e => setForm(f=>({...f, observations: e.target.value}))} className="input-field resize-none" rows={2} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Certificate (optional)</label>
            <input type="file" onChange={e => setFile(e.target.files[0])} className="text-xs text-slate-600" accept=".pdf,.jpg,.png" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Calibration'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Lifecycle Timeline ───────────────────────────────────────────────────
function LifecycleTimeline({ equipment, history }) {
  const events = [];

  if (equipment.purchaseDate) events.push({ date: new Date(equipment.purchaseDate), label: 'Purchased', icon: DollarSign, color: 'bg-blue-500' });
  if (equipment.installationDate) events.push({ date: new Date(equipment.installationDate), label: 'Installed', icon: CheckCircle, color: 'bg-indigo-500' });
  if (equipment.department) events.push({ date: new Date(equipment.createdAt), label: `Assigned to ${equipment.department?.name || 'Department'}`, icon: Building2, color: 'bg-teal-500' });

  history.transfers?.forEach(t => events.push({ date: new Date(t.transferDate), label: `Transferred → ${t.newDepartment?.name}`, icon: ArrowLeftRight, color: 'bg-orange-500' }));
  history.maintenance?.filter(m => m.status === 'Completed').forEach(m => events.push({ date: new Date(m.completedDate || m.scheduledDate), label: `Maintenance Completed (${m.type})`, icon: Wrench, color: 'bg-emerald-500' }));
  history.calibrations?.filter(c => c.status === 'Completed').forEach(c => events.push({ date: new Date(c.calibrationDate), label: `Calibration — ${c.result}`, icon: Gauge, color: 'bg-purple-500' }));
  history.complaints?.forEach(c => events.push({ date: new Date(c.createdAt), label: `Complaint: ${c.issueDescription?.slice(0,40)}...`, icon: AlertCircle, color: 'bg-amber-500' }));
  if (history.disposal) events.push({ date: new Date(history.disposal.disposalDate), label: 'Disposed', icon: Trash2, color: 'bg-red-500' });

  events.sort((a, b) => a.date - b.date);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Equipment Lifecycle Timeline</h3>
      {events.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No lifecycle events yet</p>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
          <div className="space-y-4">
            {events.map((event, i) => (
              <div key={i} className="flex items-start gap-4 relative pl-2">
                <div className={`h-8 w-8 ${event.color} rounded-full flex items-center justify-center flex-shrink-0 z-10`}>
                  <event.icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 pb-2">
                  <p className="text-xs font-semibold text-slate-800">{event.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{event.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Equipment Details Page ───────────────────────────────────────────────
export default function EquipmentDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'Admin';
  const isEngineer = user?.role === 'Biomedical Engineer';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [departments, setDepartments] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDisposal, setShowDisposal] = useState(false);
  const [showAddMaint, setShowAddMaint] = useState(false);
  const [showAddCal, setShowAddCal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await equipmentAPI.getById(id);
      if (res.data.success) setData(res.data);

      if (isAdmin) {
        const [depts, users] = await Promise.all([departmentAPI.getAll(), authAPI.getUsers()]);
        if (depts.data.success) setDepartments(depts.data.departments);
        if (users.data.success) setEngineers(users.data.users.filter(u => u.role === 'Biomedical Engineer'));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data?.equipment) return <div className="text-center py-16 text-slate-500">Equipment not found</div>;

  const { equipment, history } = data;

  const downloadQR = () => {
    if (!equipment.qrCode) return;
    const a = document.createElement('a');
    a.href = equipment.qrCode;
    a.download = `QR-${equipment.equipmentId}.png`;
    a.click();
  };

  const now = new Date();
  const warrantyStatus = equipment.warrantyEnd ? (new Date(equipment.warrantyEnd) < now ? 'Expired' : 'Active') : null;
  const amcStatus = equipment.amcEnd ? (new Date(equipment.amcEnd) < now ? 'Expired' : 'Active') : null;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Equipment
      </button>

      {/* Equipment Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Icon + Name */}
          <div className="flex items-center gap-4 flex-1">
            <div className="h-14 w-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Stethoscope className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-slate-800">{equipment.name}</h2>
                <StatusBadge status={equipment.currentStatus} large />
              </div>
              <p className="text-sm text-slate-400 font-mono mt-1">{equipment.equipmentId}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{equipment.department?.name}</span>
                {equipment.roomNumber && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Room {equipment.roomNumber}</span>}
                {equipment.assignedEngineer && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{equipment.assignedEngineer.name}</span>}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowQRModal(true)} className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors border border-emerald-200 shadow-sm">
              <QrCode className="h-3.5 w-3.5 text-emerald-600" /> Print QR Tag
            </button>
            {isAdmin && !equipment.isDisposed && (
              <>
                <button onClick={() => setShowTransfer(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors border border-blue-200">
                  <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer
                </button>
                <button onClick={() => setShowDisposal(true)} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors border border-red-200">
                  <Trash2 className="h-3.5 w-3.5" /> Dispose
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 overflow-x-auto">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab}
                {tab === 'Maintenance' && history.maintenance?.length > 0 && <span className="ml-1.5 text-[9px] bg-slate-200 text-slate-600 px-1 py-0.5 rounded-full">{history.maintenance.length}</span>}
                {tab === 'Complaints' && history.complaints?.length > 0 && <span className="ml-1.5 text-[9px] bg-orange-100 text-orange-600 px-1 py-0.5 rounded-full">{history.complaints.length}</span>}
                {tab === 'Calibration' && history.calibrations?.length > 0 && <span className="ml-1.5 text-[9px] bg-slate-200 text-slate-600 px-1 py-0.5 rounded-full">{history.calibrations.length}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* ── Overview Tab ─────────────────────────────────────── */}
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment Information</h4>
                {[
                  ['Manufacturer', equipment.manufacturer],
                  ['Model Number', equipment.modelNumber],
                  ['Serial Number', equipment.serialNumber],
                  ['Category', equipment.category],
                  ['Purchase Date', equipment.purchaseDate ? new Date(equipment.purchaseDate).toLocaleDateString() : null],
                  ['Purchase Cost', equipment.purchaseCost ? `₹${Number(equipment.purchaseCost).toLocaleString()}` : null],
                  ['Installation Date', equipment.installationDate ? new Date(equipment.installationDate).toLocaleDateString() : null],
                  ['Useful Life', equipment.usefulLife ? `${equipment.usefulLife} years` : null],
                  ['Building', equipment.building],
                  ['Room', equipment.roomNumber],
                  ['Remarks', equipment.remarks],
                ].map(([label, value]) => value ? (
                  <div key={label} className="flex justify-between text-sm border-b border-slate-50 pb-2">
                    <span className="text-slate-500 text-xs">{label}</span>
                    <span className="text-slate-800 text-xs font-medium text-right">{value}</span>
                  </div>
                ) : null)}
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Maintenance & Calibration Status</h4>
                {[
                  ['Last Maintenance', equipment.lastMaintenanceDate ? new Date(equipment.lastMaintenanceDate).toLocaleDateString() : 'Not recorded'],
                  ['Next Maintenance', equipment.nextMaintenanceDate ? new Date(equipment.nextMaintenanceDate).toLocaleDateString() : 'Not scheduled'],
                  ['Last Calibration', equipment.lastCalibrationDate ? new Date(equipment.lastCalibrationDate).toLocaleDateString() : 'Not recorded'],
                  ['Next Calibration', equipment.nextCalibrationDate ? new Date(equipment.nextCalibrationDate).toLocaleDateString() : 'Not scheduled'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm border-b border-slate-50 pb-2">
                    <span className="text-slate-500 text-xs">{label}</span>
                    <span className="text-slate-800 text-xs font-medium">{value}</span>
                  </div>
                ))}

                <div className="mt-4 space-y-2">
                  <div className={`p-3 rounded-lg border ${warrantyStatus === 'Active' ? 'bg-emerald-50 border-emerald-200' : warrantyStatus === 'Expired' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-xs font-semibold text-slate-600">Warranty</p>
                    <p className="text-xs text-slate-500 mt-0.5">{equipment.warrantyEnd ? `Until ${new Date(equipment.warrantyEnd).toLocaleDateString()}` : 'Not set'}</p>
                    {warrantyStatus && <span className={`text-[10px] font-bold ${warrantyStatus === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>{warrantyStatus}</span>}
                  </div>
                  <div className={`p-3 rounded-lg border ${amcStatus === 'Active' ? 'bg-emerald-50 border-emerald-200' : amcStatus === 'Expired' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-xs font-semibold text-slate-600">AMC</p>
                    <p className="text-xs text-slate-500 mt-0.5">{equipment.amcEnd ? `Until ${new Date(equipment.amcEnd).toLocaleDateString()}` : 'Not set'}</p>
                    {amcStatus && <span className={`text-[10px] font-bold ${amcStatus === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>{amcStatus}</span>}
                  </div>
                  {equipment.supplierVendor && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs font-semibold text-slate-600">Vendor</p>
                      <p className="text-xs text-slate-700 mt-0.5">{equipment.supplierVendor.companyName}</p>
                      {equipment.supplierVendor.contactPerson && <p className="text-[10px] text-slate-400">{equipment.supplierVendor.contactPerson} · {equipment.supplierVendor.email}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Maintenance Tab ──────────────────────────────────── */}
          {activeTab === 'Maintenance' && (
            <div>
              {(isAdmin || isEngineer) && (
                <div className="flex justify-end mb-4">
                  <button onClick={() => setShowAddMaint(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Schedule Maintenance
                  </button>
                </div>
              )}
              {history.maintenance?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No maintenance records</p>
              ) : (
                <div className="space-y-3">
                  {history.maintenance.map(m => (
                    <div key={m._id} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="text-xs font-bold text-slate-700">{m.type} Maintenance</span>
                          <p className="text-xs text-slate-400 mt-0.5">Scheduled: {new Date(m.scheduledDate).toLocaleDateString()}</p>
                          {m.completedDate && <p className="text-xs text-slate-400">Completed: {new Date(m.completedDate).toLocaleDateString()}</p>}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : m.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{m.status}</span>
                      </div>
                      {m.workDescription && <p className="text-xs text-slate-600"><span className="font-medium">Work:</span> {m.workDescription}</p>}
                      {m.partsReplaced && <p className="text-xs text-slate-600 mt-1"><span className="font-medium">Parts:</span> {m.partsReplaced}</p>}
                      {m.cost > 0 && <p className="text-xs text-slate-600 mt-1"><span className="font-medium">Cost:</span> ₹{m.cost.toLocaleString()}</p>}
                      {m.engineer && <p className="text-xs text-slate-400 mt-1">Engineer: {m.engineer.name}</p>}
                      {m.remarks && <p className="text-xs text-slate-400 mt-1">Remarks: {m.remarks}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Complaints Tab ───────────────────────────────────── */}
          {activeTab === 'Complaints' && (
            <div>
              {history.complaints?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No complaints for this equipment</p>
              ) : (
                <div className="space-y-3">
                  {history.complaints.map(c => (
                    <div key={c._id} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-mono font-bold text-slate-700">{c.complaintId}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{c.issueDescription}</p>
                          <p className="text-xs text-slate-400 mt-1">Raised by: {c.raisedBy?.name} · {new Date(c.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <ComplaintBadge status={c.status} />
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.priority === 'Critical' ? 'bg-red-100 text-red-700' : c.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>{c.priority}</span>
                        </div>
                      </div>
                      {c.assignedEngineer && <p className="text-xs text-slate-400 mt-1">Assigned to: {c.assignedEngineer.name}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Calibration Tab ──────────────────────────────────── */}
          {activeTab === 'Calibration' && (
            <div>
              {(isAdmin || isEngineer) && (
                <div className="flex justify-end mb-4">
                  <button onClick={() => setShowAddCal(true)} className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Log Calibration
                  </button>
                </div>
              )}
              {history.calibrations?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No calibration records</p>
              ) : (
                <div className="space-y-3">
                  {history.calibrations.map(c => (
                    <div key={c._id} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-700">Calibration — {c.result}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Date: {new Date(c.calibrationDate).toLocaleDateString()} · Due: {new Date(c.dueDate).toLocaleDateString()}</p>
                          {c.observations && <p className="text-xs text-slate-600 mt-1">{c.observations}</p>}
                          {c.engineer && <p className="text-xs text-slate-400 mt-1">Engineer: {c.engineer.name}</p>}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.result === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{c.result}</span>
                      </div>
                      {c.certificateUpload && (
                        <a href={getFileUrl(c.certificateUpload)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <FileText className="h-3 w-3" /> View Certificate
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Warranty & AMC Tab ───────────────────────────────── */}
          {activeTab === 'Warranty & AMC' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className={`p-5 rounded-xl border-2 ${warrantyStatus === 'Active' ? 'border-emerald-200 bg-emerald-50' : warrantyStatus === 'Expired' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className={`h-5 w-5 ${warrantyStatus === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <h4 className="font-bold text-sm text-slate-800">Warranty</h4>
                  {warrantyStatus && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${warrantyStatus === 'Active' ? 'bg-emerald-200 text-emerald-700' : 'bg-red-200 text-red-700'}`}>{warrantyStatus}</span>}
                </div>
                {equipment.warrantyStart && <p className="text-xs text-slate-600">Start: {new Date(equipment.warrantyStart).toLocaleDateString()}</p>}
                {equipment.warrantyEnd && <p className="text-xs text-slate-600 mt-1">End: {new Date(equipment.warrantyEnd).toLocaleDateString()}</p>}
                {!equipment.warrantyStart && !equipment.warrantyEnd && <p className="text-xs text-slate-400">Not set</p>}
              </div>

              <div className={`p-5 rounded-xl border-2 ${amcStatus === 'Active' ? 'border-emerald-200 bg-emerald-50' : amcStatus === 'Expired' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className={`h-5 w-5 ${amcStatus === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <h4 className="font-bold text-sm text-slate-800">AMC</h4>
                  {amcStatus && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${amcStatus === 'Active' ? 'bg-emerald-200 text-emerald-700' : 'bg-red-200 text-red-700'}`}>{amcStatus}</span>}
                </div>
                {equipment.amcStart && <p className="text-xs text-slate-600">Start: {new Date(equipment.amcStart).toLocaleDateString()}</p>}
                {equipment.amcEnd && <p className="text-xs text-slate-600 mt-1">End: {new Date(equipment.amcEnd).toLocaleDateString()}</p>}
                {!equipment.amcStart && !equipment.amcEnd && <p className="text-xs text-slate-400">Not set</p>}
              </div>

              {equipment.supplierVendor && (
                <div className="md:col-span-2 p-5 bg-white rounded-xl border border-slate-200">
                  <h4 className="font-bold text-sm text-slate-800 mb-3">Vendor Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-slate-500">Company:</span> <span className="font-medium text-slate-800 ml-1">{equipment.supplierVendor.companyName}</span></div>
                    <div><span className="text-slate-500">Contact:</span> <span className="font-medium text-slate-800 ml-1">{equipment.supplierVendor.contactPerson}</span></div>
                    <div><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-800 ml-1">{equipment.supplierVendor.email}</span></div>
                    <div><span className="text-slate-500">Phone:</span> <span className="font-medium text-slate-800 ml-1">{equipment.supplierVendor.phone}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Transfer History Tab ─────────────────────────────── */}
          {activeTab === 'Transfer History' && (
            <div>
              {history.transfers?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No transfer history</p>
              ) : (
                <div className="space-y-3">
                  {history.transfers.map(t => (
                    <div key={t._id} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <ArrowLeftRight className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-700">{t.previousDepartment?.name} <span className="text-slate-400 font-normal">→</span> {t.newDepartment?.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(t.transferDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">Reason: {t.reason}</p>
                      {t.approvedBy && <p className="text-xs text-slate-400 mt-1">Approved by: {t.approvedBy.name}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Documents Tab ─────────────────────────────────────── */}
          {activeTab === 'Documents' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* QR Code */}
              <div className="border border-slate-200 rounded-xl p-5 text-center">
                <QrCode className="h-6 w-6 text-slate-400 mx-auto mb-3" />
                <h4 className="text-xs font-bold text-slate-700 mb-3">QR Code</h4>
                {equipment.qrCode ? (
                  <>
                    <img src={equipment.qrCode} alt="QR Code" className="mx-auto mb-3 rounded-lg w-32 h-32 object-contain border border-slate-200 p-1" />
                    <button onClick={downloadQR} className="flex items-center gap-2 mx-auto px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
                      <Download className="h-3.5 w-3.5" /> Download QR
                    </button>
                  </>
                ) : <p className="text-xs text-slate-400">No QR code</p>}
              </div>

              {/* Equipment Image */}
              <div className="border border-slate-200 rounded-xl p-5 text-center">
                <Stethoscope className="h-6 w-6 text-slate-400 mx-auto mb-3" />
                <h4 className="text-xs font-bold text-slate-700 mb-3">Equipment Photo</h4>
                {equipment.image ? (
                  <img src={getFileUrl(equipment.image)} alt="equipment" className="mx-auto rounded-lg w-32 h-32 object-cover border border-slate-200" />
                ) : <p className="text-xs text-slate-400">No image uploaded</p>}
              </div>

              {/* Manual PDF */}
              <div className="border border-slate-200 rounded-xl p-5 text-center">
                <FileText className="h-6 w-6 text-slate-400 mx-auto mb-3" />
                <h4 className="text-xs font-bold text-slate-700 mb-3">Service Manual</h4>
                {equipment.manualPdf ? (
                  <a href={getFileUrl(equipment.manualPdf)} target="_blank" rel="noreferrer" className="flex items-center gap-2 mx-auto px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors justify-center">
                    <Download className="h-3.5 w-3.5" /> View Manual
                  </a>
                ) : <p className="text-xs text-slate-400">No manual uploaded</p>}
              </div>

              {/* Disposal Record */}
              {history.disposal && (
                <div className="md:col-span-3 border border-red-200 bg-red-50 rounded-xl p-5">
                  <h4 className="text-xs font-bold text-red-700 mb-3 flex items-center gap-2"><Trash2 className="h-4 w-4" />Disposal Record</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-slate-500">Date:</span> <span className="font-medium text-slate-800 ml-1">{new Date(history.disposal.disposalDate).toLocaleDateString()}</span></div>
                    <div><span className="text-slate-500">Method:</span> <span className="font-medium text-slate-800 ml-1">{history.disposal.disposalMethod}</span></div>
                    <div><span className="text-slate-500">Scrap Value:</span> <span className="font-medium text-slate-800 ml-1">₹{history.disposal.scrapValue || 0}</span></div>
                    <div><span className="text-slate-500">Reason:</span> <span className="font-medium text-slate-800 ml-1">{history.disposal.reason}</span></div>
                  </div>
                  {history.disposal.remarks && <p className="text-xs text-slate-500 mt-2">Remarks: {history.disposal.remarks}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lifecycle Timeline */}
      <LifecycleTimeline equipment={equipment} history={history} />

      {/* Modals */}
      {showTransfer && <TransferModal equipment={equipment} departments={departments} onClose={() => setShowTransfer(false)} onSaved={() => { setShowTransfer(false); load(); }} />}
      {showDisposal && <DisposalModal equipment={equipment} onClose={() => setShowDisposal(false)} onSaved={() => { setShowDisposal(false); load(); }} />}
      {showAddMaint && <AddMaintenanceModal equipment={equipment} engineers={engineers} onClose={() => setShowAddMaint(false)} onSaved={() => { setShowAddMaint(false); load(); }} />}
      {showAddCal && <AddCalibrationModal equipment={equipment} onClose={() => setShowAddCal(false)} onSaved={() => { setShowAddCal(false); load(); }} />}
      <QRGeneratorModal equipment={equipment} isOpen={showQRModal} onClose={() => setShowQRModal(false)} />
    </div>
  );
}
